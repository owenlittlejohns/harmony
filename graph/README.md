# Harmony UMM-Var groupings

TRT-92 is an enabler epic to investigate how UMM-Var associations can be used
to support inclusion and exclusion rules for variables during transformations,
such that end-users are more likely to retrieve meaningful output.

Part of this work, DAS-1185, is to produce a Harmony prototype that uses
variable-to-variable associations to augment the message sent to backend
services to include both the variables requested by the end-user, and those
upon which the requested variables depend.

This work is split into two main places:

* This directory - which contains documentation and scripts to populate a local
  graph database.
* `app/frontends/ogc-coverages/util/required-variables.ts` - which contains
  new code to query a local graph database.

These will be described in detail below.

### Prerequisites and setup:

This prototype uses a local [neo4j](https://neo4j.com/download/) instance. This
is not completely analogous to CMR, as they use an AWS Neptune instance, but it
enables local development. The neoj4 desktop application should be downloaded
and setup on your local machine. In addition, a new database should be created.

With neo4j installed and a database created via the neo4j desktop application,
it will be necessary to setup Harmony to run locally. This should not use
Harmony-in-a-Box, as that will not capture local development changes. The
instructions for local setup can be followed from the main README in this
repository, including:

1) Stopping Harmony-in-a-Box (if running): `kubectl delete ns argo`
2) Creating (or updating) a `sqlite3` database: `bin/create-database -o development`
3) Adding the following lines to your `.env` file (comment them out when returning to
   Harmony-in-a-Box):

   ```
   LOCALSTACK_HOST=localhost
   BACKEND_HOST=host.docker.internal
   ARGO_URL=http://localhost:2746
   CALLBACK_URL_ROOT=http://host.docker.internal.3001
   ```
4) Starting Argo: `bin/start-argo`
5) Enabling the correct Node.js version: `nvm use`.
6) Installing all dependencies: `npm install`.
7) Running Harmony locally, with hot-reloads: `npm run start-dev`.

To achieve the steps above, Argo, Dockerhub (with Kubernetes enabled) and other
requirements outlined in the main repository README should be installed.

To return to Harmony-in-a-Box, it is probably best to:

1) Stop the development instance of Harmony.
2) Stop Argo with `kubectl delete ns argo`
3) Comment out the new additions to the `.env` file.
4) Run `bin/bootstrap-harmony`.

### Populating variable association data:

This can be done at any point, once your neo4j desktop application is running
and the appropriate test database is active.

1) In this repository, run `npm run populate-graph`.
2) In the neo4j desktop client, open the database and perform the following search:

   ```
   MATCH (collection:Collection) RETURN collection
   ```

The query above should return 2 vertices, one each for ATL08 and RSSMIF16D.
Clicking on either vertex should show some buttons, including one that expands
and collapses child relationships. Clicking on that button should show all the
variable vertices and the edges between them.

### Using variable-to-variable associations:

The `app/frontends/ogc-coverages/util/required-variables.ts` module contains
functionality that will receive a representation of all the variables a user has
requested, if any are specified, and use that as a basis for querying the neo4j
database.

The test data includes two collections:

* ATL08
* RSSMIF16D

These collections are configured for the Data Services Variable Subsetter and
HOSS, respectively. To test that variable associations are being traversed
`harmony-py` can be used to construct appropriate requests:

#### RSSMIF16D `harmony-py` request:

```
$ python
> from harmony import BBox, Client, Collection, Environment, Request
>
> bounding_box = BBox(n=-10, e=120, s=-30, w=60)
> collection = Collection(id='C1238392622-EEDTEST')
> client = Client(env=Environment.LOCAL)
>
> request = Request(collection=collection, max_results=1, spatial=bounding_box,
>                   variables=['rainfall_rate'])
> job_id = client.submit(request)
```

#### ATL08 `harmony-py` request:

```
$ python
> from harmony import Client, Collection, Environment, Request
>
> collection = Collection(id='C1234714698-EEDTEST')
> client = Client(env=Environment.LOCAL)
> request = Request(collection=collection, max_results=1,
>                   variables=['/gt1l/signal_photons/classed_pc_flag'])
> job_id = client.submit(request)
```

For both requests, the status of the job can be checked at `localhost:3000/jobs`.
From that URL, it will be possible to download the output from localstack. To
see that the variables were extracted before getting to the backend service,
navigate to the local instance of Argo, at `localhost:2746`. Find the workflow
associated with each request. Looking at the logs associated with the last
step, there should be logging from the backend service itself. Both HOSS and
the Variable Subsetter state the requested variables they receive from the
Harmony message, and those that they infer as being required using `sds-varinfo`.
For these requests, the lists should match, as Harmony has already extracted
the required variables.

For the examples above:

#### ATL08 all expected variables:

* `/gt1l/signal_photons/classed_pc_flag`
* `/gt1l/signal_photons/delta_time`
* `/gt1l/land_segments/ph_ndx_beg`
* `/gt1l/land_segments/ph_segment_id`
* `/gt1l/land_segments/delta_time`
* `/gt1l/land_segments/latitude`
* `/gt1l/land_segments/longitude`

#### RSSMIF16D all expected variables:

* `/rainfall_rate`
* `/latitude`
* `/longitude`
* `/time`

### Caveats:

This functionality differs from the expected CMR implementation in several
key ways:

* CMR uses AWS Neptune and a Gremlin endpoint.
* A new neo4j driver and session are declared for every request. With the
  Gremlin Node.js package, a session instance is also required, but a new
  session may not be created for every request. Harmony will likely maintain a
  number of set connections, to minimise too many concurrent connections to the
  AWS Neptune instance.
* A query string is constructed and sent to the neo4j instance in the prototype.
  In practice, an endpoint specific to the UMM-Var association query would
  likely be constructed, with query parameters limited to the list of UMM-Var
  concept IDs. The query itself could be behind the endpoint, making the
  querying mechanism more secure, and preventing artibrary query strings being
  sent to the AWS Neptune instance.
