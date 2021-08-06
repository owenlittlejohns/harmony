import * as Neo4J from 'neo4j-driver';

import { VariableInfo } from './variable-parsing';
import { CmrUmmVariable } from '../../../util/cmr';

/**
 * A prepared Cypher query string to retrieve all variable names and concept IDs
 * for variables that are connected to those with a concept ID in a supplied
 * array, via a path of at least one REQUIRES edge.
 */
const requiredVariableQuery = `MATCH (requestedVariable:Variable)-[:REQUIRES *1..]->(requiredVariable)
  WHERE requestedVariable.ConceptId IN $requestedVariableConceptIds
  RETURN DISTINCT requiredVariable.ConceptId AS ConceptId, requiredVariable.Name as Name`;

/**
 * A function to retrieve a neo4j driver, to allow connections to a local
 * instance of neo4j. This function will use environment variables, if present,
 * including a password for the neo4j database instance, which must be set.
 * Because this is a prototype, and the related code footprint is being minimised,
 * there will be a new driver and new session instance for every request. This
 * is not performant, and would be better to be instantiated when Harmony is
 * initially started.
 * @returns driver - A neo4j.Driver instance
 */
function getNeo4jDriver(): Neo4J.Driver {
  const neo4jProtocol = process.env.NEO4J_PROTOCOL || 'bolt';
  const neo4jHost = process.env.NEO4J_HOST || 'localhost';
  const neo4jPort = process.env.NEO4J_PORT || '7687';
  const neo4jUrl = `${neo4jProtocol}://${neo4jHost}:${neo4jPort}`;

  const neo4jUsername = process.env.NEO4J_USERNAME || 'neo4j';
  const neo4jPassword = process.env.NEO4J_PASSWORD;

  return Neo4J.driver(neo4jUrl, Neo4J.auth.basic(neo4jUsername, neo4jPassword));
}

/**
 * Creates a neo4j session object that is specific to the UMM-Var test database
 * using the neo4j driver.
 * @param driver - a valid neo4j Driver instance.
 * @returns session - a session connected to the UMM-Var database.
 */
function getNeo4jSession(driver: Neo4J.Driver): Neo4J.Session {
  const database = process.env.NEO4J_DATABASE || 'neo4j';

  return driver.session({ database, defaultAccessMode: Neo4J.session.READ });
}

/**
 * A general purpose function to perform a Cypher query against the UMM-Var
 * test database.
 *
 * @param session - a valid neo4j session connected to the UMM-Var database.
 * @param queryString - the Cypher query to be conducted.
 * @param queryParameters - any parameters that should be added to the query,
 *   allowing for templated query strings that insert dynamic values.
 * @param resultsCallback - a function to parse the desired information from each
 *   matching result.
 * @returns an array of results that have been transformed using the `resultsCallback`.
 */
async function performCypherQuery(
  session: Neo4J.Session,
  queryString: string,
  queryParameters,
  resultsCallback,
): Promise<Array<CmrUmmVariable>> {
  return session
    .run(queryString, queryParameters)
    .then((results) => resultsCallback(results))
    .catch((error) => console.log(error))
    .finally(() => session.close());
}

/**
 * A helper function to parse the results of a the Cypher query and map the
 * retrieved record entities to an array of CmrUmmVariable items.
 *
 * @param result - the output results from the neo4j session query.
 * @returns cmrUmmVariables - an array of CmrUmmVariable instances.
 */
async function extractVariableResults(result: Neo4J.QueryResult): Promise<Array<CmrUmmVariable>> {
  return result.records.map((record: Neo4J.Record): CmrUmmVariable => {
    const conceptId = record.get('ConceptId');
    const name = record.get('Name');
    return { meta: { 'concept-id': conceptId }, umm: { Name: name } };
  });
}

/**
 * Performs a Cypher query against a neo4j graph database to retrieve all
 * variables required by those specified in the Harmony request URL.
 *
 * @param requestedVariables - an array of variable concept IDs.
 * @returns requiredVariables - an array of CmrUmmVariable instances for required variables.
 */
async function getRequiredVariables(
  requestedVariableConceptIds: Array<string>,
): Promise<Array<CmrUmmVariable>> {
  const driver = getNeo4jDriver();
  const session = getNeo4jSession(driver);

  const requiredVariables = await performCypherQuery(
    session,
    requiredVariableQuery,
    { requestedVariableConceptIds },
    extractVariableResults,
  );
  await driver.close();

  return requiredVariables;
}

/**
 * Given an array of variables that have been extracted from the Harmony request
 * URL, extract the UMM-Var concept IDs. Use these concept IDs to query a neo4j
 * graph database to extract all the further variables that those from the Harmony
 * request depend upon. This dependencies include grid-dimension variables,
 * uncertainty variables, dimensions or subset control variables.
 *
 * @param varInfos - a VariableInfo instance containing the original requested
 *   variables as specified in the Harmony request URL. Note, this can contain
 *   multiple collections.
 * @returns varInfos - The input varInfos is mutated in place to include the
 *   required variables that weren't already listed by the request.
 */
export default async function addRequiredVariables(
  varInfos: VariableInfo[],
): Promise<VariableInfo[]> {
  for (const varInfo of varInfos) {
    if (Object.prototype.hasOwnProperty.call(varInfo, 'variables')) {
      const requestedVariableConceptIds = varInfo.variables.map((variable) => variable.meta['concept-id']);

      const requiredVariables = await getRequiredVariables(requestedVariableConceptIds);

      requiredVariables.forEach((variable) => {
        if (!varInfo.variables.some((requestedVariable) => requestedVariable.meta['concept-id'] === variable.meta['concept-id'])
        ) {
          varInfo.variables.push(variable);
        }
      });
    }
  }

  return varInfos;
}
