import { ConnectorConfig, DataConnect, QueryRef, QueryPromise, ExecuteQueryOptions, MutationRef, MutationPromise, DataConnectSettings } from 'firebase/data-connect';

export const connectorConfig: ConnectorConfig;
export const dataConnectSettings: DataConnectSettings;

export type TimestampString = string;
export type UUIDString = string;
export type Int64String = string;
export type DateString = string;




export interface CreateDevisDqeData {
  devisDqe_insert: DevisDqe_Key;
}

export interface CreateDevisDqeVariables {
  projetId: UUIDString;
  codeArticle?: string | null;
  ifcGuid?: string | null;
  niveauSpatial?: string | null;
  quantiteIfcBrute: number;
  quantiteFacturable?: number | null;
  quantiteExecutee?: number | null;
  prixTotalHt?: number | null;
  statutPrix?: string | null;
}

export interface CreateMappingBimPrixData {
  mappingBimPrix_insert: MappingBimPrix_Key;
}

export interface CreateMappingBimPrixVariables {
  macroCodeBim: string;
  codeArticle: string;
  ratioConversion?: number | null;
}

export interface CreateProjetData {
  projet_insert: Projet_Key;
}

export interface CreateProjetVariables {
  nomProjet: string;
  localisation?: string | null;
  description?: string | null;
  fraisGenerauxPct?: number | null;
  margeAleasPct?: number | null;
}

export interface DevisDqe_Key {
  id: UUIDString;
  __typename?: 'DevisDqe_Key';
}

export interface GetMappingBimData {
  mappingBimPrixes: ({
    id: UUIDString;
    macroCodeBim: string;
    ratioConversion?: number | null;
    mercurialePrix: {
      codeArticle: string;
      nomMateriau: string;
      unite: string;
      prixTotalUnitaire?: number | null;
    } & MercurialePrix_Key;
  } & MappingBimPrix_Key)[];
}

export interface GetMappingBimVariables {
  macroCodeBim: string;
}

export interface GetMercurialeData {
  mercurialePrixes: ({
    codeArticle: string;
    nomMateriau: string;
    designation: string;
    unite: string;
    prixUnitaireFourniture: number;
    prixUnitaireMainOeuvre: number;
    prixTotalUnitaire?: number | null;
    categorieLot?: string | null;
  } & MercurialePrix_Key)[];
}

export interface GetProjetDqeData {
  projet?: {
    id: UUIDString;
    nomProjet: string;
    localisation?: string | null;
    description?: string | null;
    fraisGenerauxPct?: number | null;
    margeAleasPct?: number | null;
    dateCreation: DateString;
    devisDqes_on_projet: ({
      id: UUIDString;
      ifcGuid?: string | null;
      niveauSpatial?: string | null;
      quantiteIfcBrute: number;
      quantiteFacturable?: number | null;
      quantiteExecutee?: number | null;
      prixTotalHt?: number | null;
      statutPrix?: string | null;
      mercurialePrix?: {
        codeArticle: string;
        nomMateriau: string;
        designation: string;
        unite: string;
        prixTotalUnitaire?: number | null;
      } & MercurialePrix_Key;
    } & DevisDqe_Key)[];
  } & Projet_Key;
}

export interface GetProjetDqeVariables {
  id: UUIDString;
}

export interface ListProjetsData {
  projets: ({
    id: UUIDString;
    nomProjet: string;
    localisation?: string | null;
    dateCreation: DateString;
  } & Projet_Key)[];
}

export interface MappingBimPrix_Key {
  id: UUIDString;
  __typename?: 'MappingBimPrix_Key';
}

export interface MercurialePrix_Key {
  codeArticle: string;
  __typename?: 'MercurialePrix_Key';
}

export interface Projet_Key {
  id: UUIDString;
  __typename?: 'Projet_Key';
}

export interface UpsertMercurialePrixData {
  mercurialePrix_upsert: MercurialePrix_Key;
}

export interface UpsertMercurialePrixVariables {
  codeArticle: string;
  nomMateriau: string;
  designation: string;
  unite: string;
  prixUnitaireFourniture: number;
  prixUnitaireMainOeuvre: number;
  categorieLot?: string | null;
  prixTotalUnitaire?: number | null;
}

interface CreateProjetRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateProjetVariables): MutationRef<CreateProjetData, CreateProjetVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateProjetVariables): MutationRef<CreateProjetData, CreateProjetVariables>;
  operationName: string;
}
export const createProjetRef: CreateProjetRef;

export function createProjet(vars: CreateProjetVariables): MutationPromise<CreateProjetData, CreateProjetVariables>;
export function createProjet(dc: DataConnect, vars: CreateProjetVariables): MutationPromise<CreateProjetData, CreateProjetVariables>;

interface UpsertMercurialePrixRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpsertMercurialePrixVariables): MutationRef<UpsertMercurialePrixData, UpsertMercurialePrixVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: UpsertMercurialePrixVariables): MutationRef<UpsertMercurialePrixData, UpsertMercurialePrixVariables>;
  operationName: string;
}
export const upsertMercurialePrixRef: UpsertMercurialePrixRef;

export function upsertMercurialePrix(vars: UpsertMercurialePrixVariables): MutationPromise<UpsertMercurialePrixData, UpsertMercurialePrixVariables>;
export function upsertMercurialePrix(dc: DataConnect, vars: UpsertMercurialePrixVariables): MutationPromise<UpsertMercurialePrixData, UpsertMercurialePrixVariables>;

interface CreateDevisDqeRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateDevisDqeVariables): MutationRef<CreateDevisDqeData, CreateDevisDqeVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateDevisDqeVariables): MutationRef<CreateDevisDqeData, CreateDevisDqeVariables>;
  operationName: string;
}
export const createDevisDqeRef: CreateDevisDqeRef;

export function createDevisDqe(vars: CreateDevisDqeVariables): MutationPromise<CreateDevisDqeData, CreateDevisDqeVariables>;
export function createDevisDqe(dc: DataConnect, vars: CreateDevisDqeVariables): MutationPromise<CreateDevisDqeData, CreateDevisDqeVariables>;

interface CreateMappingBimPrixRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateMappingBimPrixVariables): MutationRef<CreateMappingBimPrixData, CreateMappingBimPrixVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateMappingBimPrixVariables): MutationRef<CreateMappingBimPrixData, CreateMappingBimPrixVariables>;
  operationName: string;
}
export const createMappingBimPrixRef: CreateMappingBimPrixRef;

export function createMappingBimPrix(vars: CreateMappingBimPrixVariables): MutationPromise<CreateMappingBimPrixData, CreateMappingBimPrixVariables>;
export function createMappingBimPrix(dc: DataConnect, vars: CreateMappingBimPrixVariables): MutationPromise<CreateMappingBimPrixData, CreateMappingBimPrixVariables>;

interface GetProjetDqeRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetProjetDqeVariables): QueryRef<GetProjetDqeData, GetProjetDqeVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetProjetDqeVariables): QueryRef<GetProjetDqeData, GetProjetDqeVariables>;
  operationName: string;
}
export const getProjetDqeRef: GetProjetDqeRef;

export function getProjetDqe(vars: GetProjetDqeVariables, options?: ExecuteQueryOptions): QueryPromise<GetProjetDqeData, GetProjetDqeVariables>;
export function getProjetDqe(dc: DataConnect, vars: GetProjetDqeVariables, options?: ExecuteQueryOptions): QueryPromise<GetProjetDqeData, GetProjetDqeVariables>;

interface ListProjetsRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListProjetsData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListProjetsData, undefined>;
  operationName: string;
}
export const listProjetsRef: ListProjetsRef;

export function listProjets(options?: ExecuteQueryOptions): QueryPromise<ListProjetsData, undefined>;
export function listProjets(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListProjetsData, undefined>;

interface GetMercurialeRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetMercurialeData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<GetMercurialeData, undefined>;
  operationName: string;
}
export const getMercurialeRef: GetMercurialeRef;

export function getMercuriale(options?: ExecuteQueryOptions): QueryPromise<GetMercurialeData, undefined>;
export function getMercuriale(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<GetMercurialeData, undefined>;

interface GetMappingBimRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetMappingBimVariables): QueryRef<GetMappingBimData, GetMappingBimVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetMappingBimVariables): QueryRef<GetMappingBimData, GetMappingBimVariables>;
  operationName: string;
}
export const getMappingBimRef: GetMappingBimRef;

export function getMappingBim(vars: GetMappingBimVariables, options?: ExecuteQueryOptions): QueryPromise<GetMappingBimData, GetMappingBimVariables>;
export function getMappingBim(dc: DataConnect, vars: GetMappingBimVariables, options?: ExecuteQueryOptions): QueryPromise<GetMappingBimData, GetMappingBimVariables>;

