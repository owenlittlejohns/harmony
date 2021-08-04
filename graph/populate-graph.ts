/**
 * Utility script to populate neo4j database with example data for ATL08 and
 * RSSMIF16D. These collections will be associated with variables. Some of the
 * contained variables will have associations with one another to allow for
 * Harmony to identify the full set of required variables to send to a service
 * based on the input variables from an end-user's request.
 *
 * Requirements:
 *
 * A running neo4j database, either local or remote, with the correct URL and
 * authentication information set to environment variables.
 *
 * Usage:
 *
 * When within the Harmony repository, run:
 *
 * `npm run populate-graph`
 *
 * Owen Littlejohns: 2021-08-05
 *
 */
import * as Neo4J from 'neo4j-driver';

import { atl08, Collection, rssmif16d, Variable } from './collection-data';

/**
 * A helper function to sanitise variable full paths as "/" is not a valid
 * character to use in Cypher labels. This label is then used as a reference
 * in further clauses of the `CREATE` statement, which create edges
 * connecting the variable vertex to be connected to either its collection or
 * other variables.
 *
 * @param variableName - e.g., '/gt1l/land_segments/latitude'
 * @returns variableLabel - e.g., 'gt1l_land_segments_latitude'
 */
function getVariableLabel(variableName: string): string {
  return variableName.replace(/^\//, '').split('/').join('_');
}

/**
 * A helper function to construct a Variable vertex creation statement,
 *
 * @param variable - an object containing a concept ID, data type and name for a variable.
 * @returns queryClause - e.g.:
 *   '(variable:Variable \{ConceptId: "V1234-EEDTEST", DataType: "float64", Name: "time"\})'
 */
function buildVariableVertex(variable: Variable): string {
  return `(${getVariableLabel(variable.name)}:Variable {ConceptId: "${variable.conceptId}", DataType: "${variable.dataType}", Name: "${variable.name}"})`;
}

/**
 * A helper function to create an edge between a Collection vertex and a
 * Variable vertex.
 *
 * @param collectionName - the string name of the collection, e.g., 'RSSMIF16D'
 * @param variable - an object containing a concept ID, data type and name for a variable
 * @returns edgeString - e.g.: '(RSSMIF16D)-[:HASVARIABLE]-\>(rainfall_rate)'
 */
function buildHasVariableEdge(collectionName: string, variable: Variable): string {
  return `(${collectionName})-[:HASVARIABLE]->(${getVariableLabel(variable.name)})`;
}

/**
 * A helper function to create an edge between two Variable vertices.
 *
 * @param origin - Variable instance associated with the origin of the edge.
 * @param destination - Variable instance associatied with the destination of the edge.
 * @returns edgeString - e.g.: '(rainfall_rate)-[:REQUIRES]-\>(time)'
 */
function buildRequiresEdge(origin: Variable, destination: Variable): string {
  return `(${getVariableLabel(origin.name)})-[:REQUIRES]->(${getVariableLabel(destination.name)})`;
}

/**
 * A helper function to build a Cypher `CREATE` statement using a data contained
 * in a Collection object. This will include vertices for the collection and
 * all contained variables, as well as edges denoting variables as belonging to
 * the collection and inter-variable requirements. (e.g., coordinates,
 * dimensions or subset control variables) will be represented by "REQUIRES"
 * edges.
 *
 * @param collection - A Collection object containing all variables and edges
 *   required to populate the graph for this collection.
 * @returns queryString - A full Cypher `CREATE` query containing vertices for
 *    the collection and all variables, and approriate edges.
 */
function getCollectionQueryString(collection: Collection): string {
  const collectionVertex = `(${collection.name}:Collection {ConceptId: "${collection.conceptId}", Name: "${collection.name}"})`;
  const variableVertices = collection.variables.map((variable) => buildVariableVertex(variable));

  const collectionEdges = collection.variables.map((variable) => buildHasVariableEdge(
    collection.name,
    variable,
  ));
  const variableEdges = collection.variableEdges.map((variableEdge) => buildRequiresEdge(
    collection.variables[variableEdge.originIndex],
    collection.variables[variableEdge.destinationIndex],
  ));
  return `CREATE ${[collectionVertex, ...variableVertices, ...collectionEdges, ...variableEdges].join(', ')}`;
}

/**
 * Creates a neo4j driver that is configured using environment variables.
 *
 * @returns driver - an instance of the neo4j.Driver, allowing connection to neo4j
 */
function getNeo4jDriver(): Neo4J.Driver {
  // Set neo4j connection parameters from environment variables
  const neo4jProtocol = process.env.NEO4J_PROTOCOL || 'bolt';
  const neo4jHost = process.env.NEO4J_HOST || 'localhost';
  const neo4jPort = process.env.NEO4J_PORT || 7687;
  const neo4jUrl = `${neo4jProtocol}://${neo4jHost}:${neo4jPort}`;

  const neo4jUsername = process.env.NEO4J_USERNAME || 'neo4j';
  const neo4jPassword = process.env.NEO4J_PASSWORD;

  return Neo4J.driver(neo4jUrl, Neo4J.auth.basic(neo4jUsername, neo4jPassword));
}

/**
 * Creates a session object that is specific to the UMM-Var test database
 * using the neo4j driver.
 *
 * @param driver - a valid neo4j Driver instance.
 * @returns session - a session connected to the UMM-Var database.
 */
function getNeo4jSession(driver: Neo4J.Driver): Neo4J.Session {
  const neo4jDatabase = process.env.NEO4J_DATABASE || 'neo4j';

  return driver.session({
    database: neo4jDatabase,
    defaultAccessMode: Neo4J.session.WRITE,
  });
}

/**
 * Creates a single transaction that will either entirely succeed, or rollback.
 * The transaction will include data for:
 *
 * - RSSMIF16D
 * - ATL08
 *
 * The contents of this function cannot be at the top level, as `await` is only
 * supported in the top level for Node.js at least 14.8.
 *
 * @param session - a neo4j.Session instance connected to the UMM-Var database
 */
async function populateDatabase(session: Neo4J.Session): Promise<void> {
  const transaction = session.beginTransaction();

  try {
    // Remove existing vertices and edges:
    await transaction.run('MATCH (vertex) DETACH DELETE vertex');
    console.log('Removed existing vertices and edges.\n');

    // Add RSSMIF16D collection and variables:
    await transaction.run(getCollectionQueryString(rssmif16d));
    console.log('RSSMIF16D query complete.\n');

    // Add ATL08 collection and variables:
    await transaction.run(getCollectionQueryString(atl08));
    console.log('ATL08 query completed.\n');

    await transaction.commit();
    console.log('Database population complete.');
  } catch (error) {
    console.log(error);
    await transaction.rollback();
    console.log('Database rolled back.');
  } finally {
    await session.close();
  }
}

/**
 * Wrapper function to enable asynchronous calls.
 */
async function main(): Promise<void> {
  const driver = getNeo4jDriver();
  const session = getNeo4jSession(driver);
  await populateDatabase(session);
  await driver.close();
}

main();
