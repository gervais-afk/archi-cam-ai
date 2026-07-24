import { CreateProjetData, CreateProjetVariables, UpsertMercurialePrixData, UpsertMercurialePrixVariables, CreateDevisDqeData, CreateDevisDqeVariables, CreateMappingBimPrixData, CreateMappingBimPrixVariables, GetProjetDqeData, GetProjetDqeVariables, ListProjetsData, GetMercurialeData, GetMappingBimData, GetMappingBimVariables } from '../';
import { UseDataConnectQueryResult, useDataConnectQueryOptions, UseDataConnectMutationResult, useDataConnectMutationOptions} from '@tanstack-query-firebase/react/data-connect';
import { UseQueryResult, UseMutationResult} from '@tanstack/react-query';
import { DataConnect } from 'firebase/data-connect';
import { FirebaseError } from 'firebase/app';


export function useCreateProjet(options?: useDataConnectMutationOptions<CreateProjetData, FirebaseError, CreateProjetVariables>): UseDataConnectMutationResult<CreateProjetData, CreateProjetVariables>;
export function useCreateProjet(dc: DataConnect, options?: useDataConnectMutationOptions<CreateProjetData, FirebaseError, CreateProjetVariables>): UseDataConnectMutationResult<CreateProjetData, CreateProjetVariables>;

export function useUpsertMercurialePrix(options?: useDataConnectMutationOptions<UpsertMercurialePrixData, FirebaseError, UpsertMercurialePrixVariables>): UseDataConnectMutationResult<UpsertMercurialePrixData, UpsertMercurialePrixVariables>;
export function useUpsertMercurialePrix(dc: DataConnect, options?: useDataConnectMutationOptions<UpsertMercurialePrixData, FirebaseError, UpsertMercurialePrixVariables>): UseDataConnectMutationResult<UpsertMercurialePrixData, UpsertMercurialePrixVariables>;

export function useCreateDevisDqe(options?: useDataConnectMutationOptions<CreateDevisDqeData, FirebaseError, CreateDevisDqeVariables>): UseDataConnectMutationResult<CreateDevisDqeData, CreateDevisDqeVariables>;
export function useCreateDevisDqe(dc: DataConnect, options?: useDataConnectMutationOptions<CreateDevisDqeData, FirebaseError, CreateDevisDqeVariables>): UseDataConnectMutationResult<CreateDevisDqeData, CreateDevisDqeVariables>;

export function useCreateMappingBimPrix(options?: useDataConnectMutationOptions<CreateMappingBimPrixData, FirebaseError, CreateMappingBimPrixVariables>): UseDataConnectMutationResult<CreateMappingBimPrixData, CreateMappingBimPrixVariables>;
export function useCreateMappingBimPrix(dc: DataConnect, options?: useDataConnectMutationOptions<CreateMappingBimPrixData, FirebaseError, CreateMappingBimPrixVariables>): UseDataConnectMutationResult<CreateMappingBimPrixData, CreateMappingBimPrixVariables>;

export function useGetProjetDqe(vars: GetProjetDqeVariables, options?: useDataConnectQueryOptions<GetProjetDqeData>): UseDataConnectQueryResult<GetProjetDqeData, GetProjetDqeVariables>;
export function useGetProjetDqe(dc: DataConnect, vars: GetProjetDqeVariables, options?: useDataConnectQueryOptions<GetProjetDqeData>): UseDataConnectQueryResult<GetProjetDqeData, GetProjetDqeVariables>;

export function useListProjets(options?: useDataConnectQueryOptions<ListProjetsData>): UseDataConnectQueryResult<ListProjetsData, undefined>;
export function useListProjets(dc: DataConnect, options?: useDataConnectQueryOptions<ListProjetsData>): UseDataConnectQueryResult<ListProjetsData, undefined>;

export function useGetMercuriale(options?: useDataConnectQueryOptions<GetMercurialeData>): UseDataConnectQueryResult<GetMercurialeData, undefined>;
export function useGetMercuriale(dc: DataConnect, options?: useDataConnectQueryOptions<GetMercurialeData>): UseDataConnectQueryResult<GetMercurialeData, undefined>;

export function useGetMappingBim(vars: GetMappingBimVariables, options?: useDataConnectQueryOptions<GetMappingBimData>): UseDataConnectQueryResult<GetMappingBimData, GetMappingBimVariables>;
export function useGetMappingBim(dc: DataConnect, vars: GetMappingBimVariables, options?: useDataConnectQueryOptions<GetMappingBimData>): UseDataConnectQueryResult<GetMappingBimData, GetMappingBimVariables>;
