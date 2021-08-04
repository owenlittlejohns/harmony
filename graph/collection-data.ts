/**
 * This module contains the collection data for ATL08 and RSSMIF16D that will
 * be used to populate a graph database. The associated type definitions are
 * also included.
 *
 * Each collection contains its concept ID and name, as well as an array of
 * variables (each with concept ID, datatype and name) and an array of edge
 * definitions. The edge definitions contain index references to the position
 * of each edge origin and destination, as those variables are stored in the
 * `variables` array.
 */

export interface Variable {
  conceptId: string;
  dataType: string;
  name: string;
}

interface VariableEdge {
  destinationIndex: number;
  originIndex: number;
}

export interface Collection {
  conceptId: string;
  name: string;
  variables: Array<Variable>;
  variableEdges: Array<VariableEdge>;
}

/**
 * Data for ATL08. This represents the variables from Ground Track 1 (left) that
 * have UMM-Var records at the time of the prototype (2021-08-05). There are
 * many more variables within even the one ground track, and 5 other ground
 * tracks. The edges between variable vertices represent dependencies from
 * dimension variables, coordinates metadata or subset control variables.
 */
export const atl08: Collection = {
  conceptId: 'C1234714698-EEDTEST',
  name: 'ATL08',
  variables: [
    { conceptId: 'V1237330160-EEDTEST', dataType: 'int16', name: '/gt1l/signal_photons/classed_pc_flag' },
    { conceptId: 'V1237330281-EEDTEST', dataType: 'float32', name: '/gt1l/land_segments/dem_h' },
    { conceptId: 'V1237332028-EEDTEST', dataType: 'float32', name: '/gt1l/land_segments/canopy/h_canopy' },
    { conceptId: 'V1237332356-EEDTEST', dataType: 'float32', name: '/gt1l/land_segments/latitude' },
    { conceptId: 'V1237332501-EEDTEST', dataType: 'float32', name: '/gt1l/land_segments/longitude' },
    { conceptId: 'V1240989290-EEDTEST', dataType: 'float64', name: '/gt1l/signal_photons/delta_time' },
    { conceptId: 'V1240989293-EEDTEST', dataType: 'int32', name: '/gt1l/signal_photons/classed_pc_indx' },
    { conceptId: 'V1240989295-EEDTEST', dataType: 'int8', name: '/gt1l/signal_photons/d_flag' },
    { conceptId: 'V1240989297-EEDTEST', dataType: 'int32', name: '/gt1l/signal_photons/ph_segment_id' },
    { conceptId: 'V1240989299-EEDTEST', dataType: 'float64', name: '/gt1l/land_segments/delta_time' },
    { conceptId: 'V1240989301-EEDTEST', dataType: 'int32', name: '/gt1l/land_segments/ph_ndx_beg' },
    { conceptId: 'V1240989303-EEDTEST', dataType: 'int64', name: '/gt1l/land_segments/n_seg_ph' },
  ],
  variableEdges: [
    { originIndex: 0, destinationIndex: 5 },
    { originIndex: 6, destinationIndex: 5 },
    { originIndex: 7, destinationIndex: 5 },
    { originIndex: 8, destinationIndex: 5 },
    { originIndex: 5, destinationIndex: 10 },
    { originIndex: 5, destinationIndex: 11 },
    { originIndex: 10, destinationIndex: 3 },
    { originIndex: 10, destinationIndex: 4 },
    { originIndex: 10, destinationIndex: 9 },
    { originIndex: 11, destinationIndex: 3 },
    { originIndex: 11, destinationIndex: 4 },
    { originIndex: 11, destinationIndex: 9 },
    { originIndex: 1, destinationIndex: 3 },
    { originIndex: 1, destinationIndex: 4 },
    { originIndex: 1, destinationIndex: 9 },
    { originIndex: 2, destinationIndex: 3 },
    { originIndex: 2, destinationIndex: 4 },
    { originIndex: 2, destinationIndex: 9 },
    { originIndex: 3, destinationIndex: 9 },
    { originIndex: 4, destinationIndex: 9 },
    { originIndex: 9, destinationIndex: 3 },
    { originIndex: 9, destinationIndex: 4 },
    { originIndex: 4, destinationIndex: 3 },
    { originIndex: 3, destinationIndex: 4 },
  ],
};

/**
 * Data for RSSMIF16D. The variable edges represent associations between
 * gridded science variables and their grid-dimension variables (latitude,
 * longitude and time).
 */
export const rssmif16d: Collection = {
  conceptId: 'C1238392622-EEDTEST',
  name: 'RSSMIF16D',
  variables: [
    { conceptId: 'V1238395074-EEDTEST', dataType: 'int16', name: 'atmosphere_water_vapor_content' },
    { conceptId: 'V1238395076-EEDTEST', dataType: 'float32', name: 'latitude' },
    { conceptId: 'V1238395077-EEDTEST', dataType: 'int16', name: 'rainfall_rate' },
    { conceptId: 'V1238395078-EEDTEST', dataType: 'int16', name: 'atmosphere_cloud_liquid_water_content' },
    { conceptId: 'V1238395080-EEDTEST', dataType: 'float32', name: 'longitude' },
    { conceptId: 'V1238395084-EEDTEST', dataType: 'int16', name: 'sst_dtime' },
    { conceptId: 'V1238395085-EEDTEST', dataType: 'int16', name: 'wind_speed' },
    { conceptId: 'V1238395086-EEDTEST', dataType: 'int16', name: 'time' },
  ],
  variableEdges: [
    { originIndex: 0, destinationIndex: 1 },
    { originIndex: 0, destinationIndex: 4 },
    { originIndex: 0, destinationIndex: 7 },
    { originIndex: 2, destinationIndex: 1 },
    { originIndex: 2, destinationIndex: 4 },
    { originIndex: 2, destinationIndex: 7 },
    { originIndex: 3, destinationIndex: 1 },
    { originIndex: 3, destinationIndex: 4 },
    { originIndex: 3, destinationIndex: 7 },
    { originIndex: 5, destinationIndex: 1 },
    { originIndex: 5, destinationIndex: 4 },
    { originIndex: 5, destinationIndex: 7 },
    { originIndex: 6, destinationIndex: 1 },
    { originIndex: 6, destinationIndex: 4 },
    { originIndex: 6, destinationIndex: 7 },
  ],
};
