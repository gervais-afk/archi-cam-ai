# Generated React README
This README will guide you through the process of using the generated React SDK package for the connector `example`. It will also provide examples on how to use your generated SDK to call your Data Connect queries and mutations.

**If you're looking for the `JavaScript README`, you can find it at [`dataconnect-generated/README.md`](../README.md)**

***NOTE:** This README is generated alongside the generated SDK. If you make changes to this file, they will be overwritten when the SDK is regenerated.*

You can use this generated SDK by importing from the package `@dataconnect/generated/react` as shown below. Both CommonJS and ESM imports are supported.

You can also follow the instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#react).

# Table of Contents
- [**Overview**](#generated-react-readme)
- [**TanStack Query Firebase & TanStack React Query**](#tanstack-query-firebase-tanstack-react-query)
  - [*Package Installation*](#installing-tanstack-query-firebase-and-tanstack-react-query-packages)
  - [*Configuring TanStack Query*](#configuring-tanstack-query)
- [**Accessing the connector**](#accessing-the-connector)
  - [*Connecting to the local Emulator*](#connecting-to-the-local-emulator)
- [**Queries**](#queries)
  - [*GetProjetDqe*](#getprojetdqe)
  - [*ListProjets*](#listprojets)
  - [*GetMercuriale*](#getmercuriale)
  - [*GetMappingBim*](#getmappingbim)
- [**Mutations**](#mutations)
  - [*CreateProjet*](#createprojet)
  - [*UpsertMercurialePrix*](#upsertmercurialeprix)
  - [*CreateDevisDqe*](#createdevisdqe)
  - [*CreateMappingBimPrix*](#createmappingbimprix)

# TanStack Query Firebase & TanStack React Query
This SDK provides [React](https://react.dev/) hooks generated specific to your application, for the operations found in the connector `example`. These hooks are generated using [TanStack Query Firebase](https://react-query-firebase.invertase.dev/) by our partners at Invertase, a library built on top of [TanStack React Query v5](https://tanstack.com/query/v5/docs/framework/react/overview).

***You do not need to be familiar with Tanstack Query or Tanstack Query Firebase to use this SDK.*** However, you may find it useful to learn more about them, as they will empower you as a user of this Generated React SDK.

## Installing TanStack Query Firebase and TanStack React Query Packages
In order to use the React generated SDK, you must install the `TanStack React Query` and `TanStack Query Firebase` packages.
```bash
npm i --save @tanstack/react-query @tanstack-query-firebase/react
```
```bash
npm i --save firebase@latest # Note: React has a peer dependency on ^11.3.0
```

You can also follow the installation instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#tanstack-install), or the [TanStack Query Firebase documentation](https://react-query-firebase.invertase.dev/react) and [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/installation).

## Configuring TanStack Query
In order to use the React generated SDK in your application, you must wrap your application's component tree in a `QueryClientProvider` component from TanStack React Query. None of your generated React SDK hooks will work without this provider.

```javascript
import { QueryClientProvider } from '@tanstack/react-query';

// Create a TanStack Query client instance
const queryClient = new QueryClient()

function App() {
  return (
    // Provide the client to your App
    <QueryClientProvider client={queryClient}>
      <MyApplication />
    </QueryClientProvider>
  )
}
```

To learn more about `QueryClientProvider`, see the [TanStack React Query documentation](https://tanstack.com/query/latest/docs/framework/react/quick-start) and the [TanStack Query Firebase documentation](https://invertase.docs.page/tanstack-query-firebase/react#usage).

# Accessing the connector
A connector is a collection of Queries and Mutations. One SDK is generated for each connector - this SDK is generated for the connector `example`.

You can find more information about connectors in the [Data Connect documentation](https://firebase.google.com/docs/data-connect#how-does).

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';

const dataConnect = getDataConnect(connectorConfig);
```

## Connecting to the local Emulator
By default, the connector will connect to the production service.

To connect to the emulator, you can use the following code.
You can also follow the emulator instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#emulator-react-angular).

```javascript
import { connectDataConnectEmulator, getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';

const dataConnect = getDataConnect(connectorConfig);
connectDataConnectEmulator(dataConnect, 'localhost', 9399);
```

After it's initialized, you can call your Data Connect [queries](#queries) and [mutations](#mutations) using the hooks provided from your generated React SDK.

# Queries

The React generated SDK provides Query hook functions that call and return [`useDataConnectQuery`](https://react-query-firebase.invertase.dev/react/data-connect/querying) hooks from TanStack Query Firebase.

Calling these hook functions will return a `UseQueryResult` object. This object holds the state of your Query, including whether the Query is loading, has completed, or has succeeded/failed, and the most recent data returned by the Query, among other things. To learn more about these hooks and how to use them, see the [TanStack Query Firebase documentation](https://react-query-firebase.invertase.dev/react/data-connect/querying).

TanStack React Query caches the results of your Queries, so using the same Query hook function in multiple places in your application allows the entire application to automatically see updates to that Query's data.

Query hooks execute their Queries automatically when called, and periodically refresh, unless you change the `queryOptions` for the Query. To learn how to stop a Query from automatically executing, including how to make a query "lazy", see the [TanStack React Query documentation](https://tanstack.com/query/latest/docs/framework/react/guides/disabling-queries).

To learn more about TanStack React Query's Queries, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/guides/queries).

## Using Query Hooks
Here's a general overview of how to use the generated Query hooks in your code:

- If the Query has no variables, the Query hook function does not require arguments.
- If the Query has any required variables, the Query hook function will require at least one argument: an object that contains all the required variables for the Query.
- If the Query has some required and some optional variables, only required variables are necessary in the variables argument object, and optional variables may be provided as well.
- If all of the Query's variables are optional, the Query hook function does not require any arguments.
- Query hook functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.
- Query hooks functions can be called with or without passing in an `options` argument of type `useDataConnectQueryOptions`. To learn more about the `options` argument, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/guides/query-options).
  - ***Special case:***  If the Query has all optional variables and you would like to provide an `options` argument to the Query hook function without providing any variables, you must pass `undefined` where you would normally pass the Query's variables, and then may provide the `options` argument.

Below are examples of how to use the `example` connector's generated Query hook functions to execute each Query. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#operations-react-angular).

## GetProjetDqe
You can execute the `GetProjetDqe` Query using the following Query hook function, which is defined in [dataconnect-generated/react/index.d.ts](./index.d.ts):

```javascript
useGetProjetDqe(dc: DataConnect, vars: GetProjetDqeVariables, options?: useDataConnectQueryOptions<GetProjetDqeData>): UseDataConnectQueryResult<GetProjetDqeData, GetProjetDqeVariables>;
```
You can also pass in a `DataConnect` instance to the Query hook function.
```javascript
useGetProjetDqe(vars: GetProjetDqeVariables, options?: useDataConnectQueryOptions<GetProjetDqeData>): UseDataConnectQueryResult<GetProjetDqeData, GetProjetDqeVariables>;
```

### Variables
The `GetProjetDqe` Query requires an argument of type `GetProjetDqeVariables`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface GetProjetDqeVariables {
  id: UUIDString;
}
```
### Return Type
Recall that calling the `GetProjetDqe` Query hook function returns a `UseQueryResult` object. This object holds the state of your Query, including whether the Query is loading, has completed, or has succeeded/failed, and any data returned by the Query, among other things.

To check the status of a Query, use the `UseQueryResult.status` field. You can also check for pending / success / error status using the `UseQueryResult.isPending`, `UseQueryResult.isSuccess`, and `UseQueryResult.isError` fields.

To access the data returned by a Query, use the `UseQueryResult.data` field. The data for the `GetProjetDqe` Query is of type `GetProjetDqeData`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:
```javascript
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
```

To learn more about the `UseQueryResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useQuery).

### Using `GetProjetDqe`'s Query hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, GetProjetDqeVariables } from '@dataconnect/generated';
import { useGetProjetDqe } from '@dataconnect/generated/react'

export default function GetProjetDqeComponent() {
  // The `useGetProjetDqe` Query hook requires an argument of type `GetProjetDqeVariables`:
  const getProjetDqeVars: GetProjetDqeVariables = {
    id: ..., 
  };

  // You don't have to do anything to "execute" the Query.
  // Call the Query hook function to get a `UseQueryResult` object which holds the state of your Query.
  const query = useGetProjetDqe(getProjetDqeVars);
  // Variables can be defined inline as well.
  const query = useGetProjetDqe({ id: ..., });

  // You can also pass in a `DataConnect` instance to the Query hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const query = useGetProjetDqe(dataConnect, getProjetDqeVars);

  // You can also pass in a `useDataConnectQueryOptions` object to the Query hook function.
  const options = { staleTime: 5 * 1000 };
  const query = useGetProjetDqe(getProjetDqeVars, options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectQueryOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = { staleTime: 5 * 1000 };
  const query = useGetProjetDqe(dataConnect, getProjetDqeVars, options);

  // Then, you can render your component dynamically based on the status of the Query.
  if (query.isPending) {
    return <div>Loading...</div>;
  }

  if (query.isError) {
    return <div>Error: {query.error.message}</div>;
  }

  // If the Query is successful, you can access the data returned using the `UseQueryResult.data` field.
  if (query.isSuccess) {
    console.log(query.data.projet);
  }
  return <div>Query execution {query.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## ListProjets
You can execute the `ListProjets` Query using the following Query hook function, which is defined in [dataconnect-generated/react/index.d.ts](./index.d.ts):

```javascript
useListProjets(dc: DataConnect, options?: useDataConnectQueryOptions<ListProjetsData>): UseDataConnectQueryResult<ListProjetsData, undefined>;
```
You can also pass in a `DataConnect` instance to the Query hook function.
```javascript
useListProjets(options?: useDataConnectQueryOptions<ListProjetsData>): UseDataConnectQueryResult<ListProjetsData, undefined>;
```

### Variables
The `ListProjets` Query has no variables.
### Return Type
Recall that calling the `ListProjets` Query hook function returns a `UseQueryResult` object. This object holds the state of your Query, including whether the Query is loading, has completed, or has succeeded/failed, and any data returned by the Query, among other things.

To check the status of a Query, use the `UseQueryResult.status` field. You can also check for pending / success / error status using the `UseQueryResult.isPending`, `UseQueryResult.isSuccess`, and `UseQueryResult.isError` fields.

To access the data returned by a Query, use the `UseQueryResult.data` field. The data for the `ListProjets` Query is of type `ListProjetsData`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface ListProjetsData {
  projets: ({
    id: UUIDString;
    nomProjet: string;
    localisation?: string | null;
    dateCreation: DateString;
  } & Projet_Key)[];
}
```

To learn more about the `UseQueryResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useQuery).

### Using `ListProjets`'s Query hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';
import { useListProjets } from '@dataconnect/generated/react'

export default function ListProjetsComponent() {
  // You don't have to do anything to "execute" the Query.
  // Call the Query hook function to get a `UseQueryResult` object which holds the state of your Query.
  const query = useListProjets();

  // You can also pass in a `DataConnect` instance to the Query hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const query = useListProjets(dataConnect);

  // You can also pass in a `useDataConnectQueryOptions` object to the Query hook function.
  const options = { staleTime: 5 * 1000 };
  const query = useListProjets(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectQueryOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = { staleTime: 5 * 1000 };
  const query = useListProjets(dataConnect, options);

  // Then, you can render your component dynamically based on the status of the Query.
  if (query.isPending) {
    return <div>Loading...</div>;
  }

  if (query.isError) {
    return <div>Error: {query.error.message}</div>;
  }

  // If the Query is successful, you can access the data returned using the `UseQueryResult.data` field.
  if (query.isSuccess) {
    console.log(query.data.projets);
  }
  return <div>Query execution {query.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## GetMercuriale
You can execute the `GetMercuriale` Query using the following Query hook function, which is defined in [dataconnect-generated/react/index.d.ts](./index.d.ts):

```javascript
useGetMercuriale(dc: DataConnect, options?: useDataConnectQueryOptions<GetMercurialeData>): UseDataConnectQueryResult<GetMercurialeData, undefined>;
```
You can also pass in a `DataConnect` instance to the Query hook function.
```javascript
useGetMercuriale(options?: useDataConnectQueryOptions<GetMercurialeData>): UseDataConnectQueryResult<GetMercurialeData, undefined>;
```

### Variables
The `GetMercuriale` Query has no variables.
### Return Type
Recall that calling the `GetMercuriale` Query hook function returns a `UseQueryResult` object. This object holds the state of your Query, including whether the Query is loading, has completed, or has succeeded/failed, and any data returned by the Query, among other things.

To check the status of a Query, use the `UseQueryResult.status` field. You can also check for pending / success / error status using the `UseQueryResult.isPending`, `UseQueryResult.isSuccess`, and `UseQueryResult.isError` fields.

To access the data returned by a Query, use the `UseQueryResult.data` field. The data for the `GetMercuriale` Query is of type `GetMercurialeData`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:
```javascript
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
```

To learn more about the `UseQueryResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useQuery).

### Using `GetMercuriale`'s Query hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';
import { useGetMercuriale } from '@dataconnect/generated/react'

export default function GetMercurialeComponent() {
  // You don't have to do anything to "execute" the Query.
  // Call the Query hook function to get a `UseQueryResult` object which holds the state of your Query.
  const query = useGetMercuriale();

  // You can also pass in a `DataConnect` instance to the Query hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const query = useGetMercuriale(dataConnect);

  // You can also pass in a `useDataConnectQueryOptions` object to the Query hook function.
  const options = { staleTime: 5 * 1000 };
  const query = useGetMercuriale(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectQueryOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = { staleTime: 5 * 1000 };
  const query = useGetMercuriale(dataConnect, options);

  // Then, you can render your component dynamically based on the status of the Query.
  if (query.isPending) {
    return <div>Loading...</div>;
  }

  if (query.isError) {
    return <div>Error: {query.error.message}</div>;
  }

  // If the Query is successful, you can access the data returned using the `UseQueryResult.data` field.
  if (query.isSuccess) {
    console.log(query.data.mercurialePrixes);
  }
  return <div>Query execution {query.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## GetMappingBim
You can execute the `GetMappingBim` Query using the following Query hook function, which is defined in [dataconnect-generated/react/index.d.ts](./index.d.ts):

```javascript
useGetMappingBim(dc: DataConnect, vars: GetMappingBimVariables, options?: useDataConnectQueryOptions<GetMappingBimData>): UseDataConnectQueryResult<GetMappingBimData, GetMappingBimVariables>;
```
You can also pass in a `DataConnect` instance to the Query hook function.
```javascript
useGetMappingBim(vars: GetMappingBimVariables, options?: useDataConnectQueryOptions<GetMappingBimData>): UseDataConnectQueryResult<GetMappingBimData, GetMappingBimVariables>;
```

### Variables
The `GetMappingBim` Query requires an argument of type `GetMappingBimVariables`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface GetMappingBimVariables {
  macroCodeBim: string;
}
```
### Return Type
Recall that calling the `GetMappingBim` Query hook function returns a `UseQueryResult` object. This object holds the state of your Query, including whether the Query is loading, has completed, or has succeeded/failed, and any data returned by the Query, among other things.

To check the status of a Query, use the `UseQueryResult.status` field. You can also check for pending / success / error status using the `UseQueryResult.isPending`, `UseQueryResult.isSuccess`, and `UseQueryResult.isError` fields.

To access the data returned by a Query, use the `UseQueryResult.data` field. The data for the `GetMappingBim` Query is of type `GetMappingBimData`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:
```javascript
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
```

To learn more about the `UseQueryResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useQuery).

### Using `GetMappingBim`'s Query hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, GetMappingBimVariables } from '@dataconnect/generated';
import { useGetMappingBim } from '@dataconnect/generated/react'

export default function GetMappingBimComponent() {
  // The `useGetMappingBim` Query hook requires an argument of type `GetMappingBimVariables`:
  const getMappingBimVars: GetMappingBimVariables = {
    macroCodeBim: ..., 
  };

  // You don't have to do anything to "execute" the Query.
  // Call the Query hook function to get a `UseQueryResult` object which holds the state of your Query.
  const query = useGetMappingBim(getMappingBimVars);
  // Variables can be defined inline as well.
  const query = useGetMappingBim({ macroCodeBim: ..., });

  // You can also pass in a `DataConnect` instance to the Query hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const query = useGetMappingBim(dataConnect, getMappingBimVars);

  // You can also pass in a `useDataConnectQueryOptions` object to the Query hook function.
  const options = { staleTime: 5 * 1000 };
  const query = useGetMappingBim(getMappingBimVars, options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectQueryOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = { staleTime: 5 * 1000 };
  const query = useGetMappingBim(dataConnect, getMappingBimVars, options);

  // Then, you can render your component dynamically based on the status of the Query.
  if (query.isPending) {
    return <div>Loading...</div>;
  }

  if (query.isError) {
    return <div>Error: {query.error.message}</div>;
  }

  // If the Query is successful, you can access the data returned using the `UseQueryResult.data` field.
  if (query.isSuccess) {
    console.log(query.data.mappingBimPrixes);
  }
  return <div>Query execution {query.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

# Mutations

The React generated SDK provides Mutations hook functions that call and return [`useDataConnectMutation`](https://react-query-firebase.invertase.dev/react/data-connect/mutations) hooks from TanStack Query Firebase.

Calling these hook functions will return a `UseMutationResult` object. This object holds the state of your Mutation, including whether the Mutation is loading, has completed, or has succeeded/failed, and the most recent data returned by the Mutation, among other things. To learn more about these hooks and how to use them, see the [TanStack Query Firebase documentation](https://react-query-firebase.invertase.dev/react/data-connect/mutations).

Mutation hooks do not execute their Mutations automatically when called. Rather, after calling the Mutation hook function and getting a `UseMutationResult` object, you must call the `UseMutationResult.mutate()` function to execute the Mutation.

To learn more about TanStack React Query's Mutations, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/guides/mutations).

## Using Mutation Hooks
Here's a general overview of how to use the generated Mutation hooks in your code:

- Mutation hook functions are not called with the arguments to the Mutation. Instead, arguments are passed to `UseMutationResult.mutate()`.
- If the Mutation has no variables, the `mutate()` function does not require arguments.
- If the Mutation has any required variables, the `mutate()` function will require at least one argument: an object that contains all the required variables for the Mutation.
- If the Mutation has some required and some optional variables, only required variables are necessary in the variables argument object, and optional variables may be provided as well.
- If all of the Mutation's variables are optional, the Mutation hook function does not require any arguments.
- Mutation hook functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.
- Mutation hooks also accept an `options` argument of type `useDataConnectMutationOptions`. To learn more about the `options` argument, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/guides/mutations#mutation-side-effects).
  - `UseMutationResult.mutate()` also accepts an `options` argument of type `useDataConnectMutationOptions`.
  - ***Special case:*** If the Mutation has no arguments (or all optional arguments and you wish to provide none), and you want to pass `options` to `UseMutationResult.mutate()`, you must pass `undefined` where you would normally pass the Mutation's arguments, and then may provide the options argument.

Below are examples of how to use the `example` connector's generated Mutation hook functions to execute each Mutation. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#operations-react-angular).

## CreateProjet
You can execute the `CreateProjet` Mutation using the `UseMutationResult` object returned by the following Mutation hook function (which is defined in [dataconnect-generated/react/index.d.ts](./index.d.ts)):
```javascript
useCreateProjet(options?: useDataConnectMutationOptions<CreateProjetData, FirebaseError, CreateProjetVariables>): UseDataConnectMutationResult<CreateProjetData, CreateProjetVariables>;
```
You can also pass in a `DataConnect` instance to the Mutation hook function.
```javascript
useCreateProjet(dc: DataConnect, options?: useDataConnectMutationOptions<CreateProjetData, FirebaseError, CreateProjetVariables>): UseDataConnectMutationResult<CreateProjetData, CreateProjetVariables>;
```

### Variables
The `CreateProjet` Mutation requires an argument of type `CreateProjetVariables`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface CreateProjetVariables {
  nomProjet: string;
  localisation?: string | null;
  description?: string | null;
  fraisGenerauxPct?: number | null;
  margeAleasPct?: number | null;
}
```
### Return Type
Recall that calling the `CreateProjet` Mutation hook function returns a `UseMutationResult` object. This object holds the state of your Mutation, including whether the Mutation is loading, has completed, or has succeeded/failed, among other things.

To check the status of a Mutation, use the `UseMutationResult.status` field. You can also check for pending / success / error status using the `UseMutationResult.isPending`, `UseMutationResult.isSuccess`, and `UseMutationResult.isError` fields.

To execute the Mutation, call `UseMutationResult.mutate()`. This function executes the Mutation, but does not return the data from the Mutation.

To access the data returned by a Mutation, use the `UseMutationResult.data` field. The data for the `CreateProjet` Mutation is of type `CreateProjetData`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface CreateProjetData {
  projet_insert: Projet_Key;
}
```

To learn more about the `UseMutationResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useMutation).

### Using `CreateProjet`'s Mutation hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, CreateProjetVariables } from '@dataconnect/generated';
import { useCreateProjet } from '@dataconnect/generated/react'

export default function CreateProjetComponent() {
  // Call the Mutation hook function to get a `UseMutationResult` object which holds the state of your Mutation.
  const mutation = useCreateProjet();

  // You can also pass in a `DataConnect` instance to the Mutation hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const mutation = useCreateProjet(dataConnect);

  // You can also pass in a `useDataConnectMutationOptions` object to the Mutation hook function.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useCreateProjet(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectMutationOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useCreateProjet(dataConnect, options);

  // After calling the Mutation hook function, you must call `UseMutationResult.mutate()` to execute the Mutation.
  // The `useCreateProjet` Mutation requires an argument of type `CreateProjetVariables`:
  const createProjetVars: CreateProjetVariables = {
    nomProjet: ..., 
    localisation: ..., // optional
    description: ..., // optional
    fraisGenerauxPct: ..., // optional
    margeAleasPct: ..., // optional
  };
  mutation.mutate(createProjetVars);
  // Variables can be defined inline as well.
  mutation.mutate({ nomProjet: ..., localisation: ..., description: ..., fraisGenerauxPct: ..., margeAleasPct: ..., });

  // You can also pass in a `useDataConnectMutationOptions` object to `UseMutationResult.mutate()`.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  mutation.mutate(createProjetVars, options);

  // Then, you can render your component dynamically based on the status of the Mutation.
  if (mutation.isPending) {
    return <div>Loading...</div>;
  }

  if (mutation.isError) {
    return <div>Error: {mutation.error.message}</div>;
  }

  // If the Mutation is successful, you can access the data returned using the `UseMutationResult.data` field.
  if (mutation.isSuccess) {
    console.log(mutation.data.projet_insert);
  }
  return <div>Mutation execution {mutation.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## UpsertMercurialePrix
You can execute the `UpsertMercurialePrix` Mutation using the `UseMutationResult` object returned by the following Mutation hook function (which is defined in [dataconnect-generated/react/index.d.ts](./index.d.ts)):
```javascript
useUpsertMercurialePrix(options?: useDataConnectMutationOptions<UpsertMercurialePrixData, FirebaseError, UpsertMercurialePrixVariables>): UseDataConnectMutationResult<UpsertMercurialePrixData, UpsertMercurialePrixVariables>;
```
You can also pass in a `DataConnect` instance to the Mutation hook function.
```javascript
useUpsertMercurialePrix(dc: DataConnect, options?: useDataConnectMutationOptions<UpsertMercurialePrixData, FirebaseError, UpsertMercurialePrixVariables>): UseDataConnectMutationResult<UpsertMercurialePrixData, UpsertMercurialePrixVariables>;
```

### Variables
The `UpsertMercurialePrix` Mutation requires an argument of type `UpsertMercurialePrixVariables`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:

```javascript
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
```
### Return Type
Recall that calling the `UpsertMercurialePrix` Mutation hook function returns a `UseMutationResult` object. This object holds the state of your Mutation, including whether the Mutation is loading, has completed, or has succeeded/failed, among other things.

To check the status of a Mutation, use the `UseMutationResult.status` field. You can also check for pending / success / error status using the `UseMutationResult.isPending`, `UseMutationResult.isSuccess`, and `UseMutationResult.isError` fields.

To execute the Mutation, call `UseMutationResult.mutate()`. This function executes the Mutation, but does not return the data from the Mutation.

To access the data returned by a Mutation, use the `UseMutationResult.data` field. The data for the `UpsertMercurialePrix` Mutation is of type `UpsertMercurialePrixData`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface UpsertMercurialePrixData {
  mercurialePrix_upsert: MercurialePrix_Key;
}
```

To learn more about the `UseMutationResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useMutation).

### Using `UpsertMercurialePrix`'s Mutation hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, UpsertMercurialePrixVariables } from '@dataconnect/generated';
import { useUpsertMercurialePrix } from '@dataconnect/generated/react'

export default function UpsertMercurialePrixComponent() {
  // Call the Mutation hook function to get a `UseMutationResult` object which holds the state of your Mutation.
  const mutation = useUpsertMercurialePrix();

  // You can also pass in a `DataConnect` instance to the Mutation hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const mutation = useUpsertMercurialePrix(dataConnect);

  // You can also pass in a `useDataConnectMutationOptions` object to the Mutation hook function.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useUpsertMercurialePrix(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectMutationOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useUpsertMercurialePrix(dataConnect, options);

  // After calling the Mutation hook function, you must call `UseMutationResult.mutate()` to execute the Mutation.
  // The `useUpsertMercurialePrix` Mutation requires an argument of type `UpsertMercurialePrixVariables`:
  const upsertMercurialePrixVars: UpsertMercurialePrixVariables = {
    codeArticle: ..., 
    nomMateriau: ..., 
    designation: ..., 
    unite: ..., 
    prixUnitaireFourniture: ..., 
    prixUnitaireMainOeuvre: ..., 
    categorieLot: ..., // optional
    prixTotalUnitaire: ..., // optional
  };
  mutation.mutate(upsertMercurialePrixVars);
  // Variables can be defined inline as well.
  mutation.mutate({ codeArticle: ..., nomMateriau: ..., designation: ..., unite: ..., prixUnitaireFourniture: ..., prixUnitaireMainOeuvre: ..., categorieLot: ..., prixTotalUnitaire: ..., });

  // You can also pass in a `useDataConnectMutationOptions` object to `UseMutationResult.mutate()`.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  mutation.mutate(upsertMercurialePrixVars, options);

  // Then, you can render your component dynamically based on the status of the Mutation.
  if (mutation.isPending) {
    return <div>Loading...</div>;
  }

  if (mutation.isError) {
    return <div>Error: {mutation.error.message}</div>;
  }

  // If the Mutation is successful, you can access the data returned using the `UseMutationResult.data` field.
  if (mutation.isSuccess) {
    console.log(mutation.data.mercurialePrix_upsert);
  }
  return <div>Mutation execution {mutation.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## CreateDevisDqe
You can execute the `CreateDevisDqe` Mutation using the `UseMutationResult` object returned by the following Mutation hook function (which is defined in [dataconnect-generated/react/index.d.ts](./index.d.ts)):
```javascript
useCreateDevisDqe(options?: useDataConnectMutationOptions<CreateDevisDqeData, FirebaseError, CreateDevisDqeVariables>): UseDataConnectMutationResult<CreateDevisDqeData, CreateDevisDqeVariables>;
```
You can also pass in a `DataConnect` instance to the Mutation hook function.
```javascript
useCreateDevisDqe(dc: DataConnect, options?: useDataConnectMutationOptions<CreateDevisDqeData, FirebaseError, CreateDevisDqeVariables>): UseDataConnectMutationResult<CreateDevisDqeData, CreateDevisDqeVariables>;
```

### Variables
The `CreateDevisDqe` Mutation requires an argument of type `CreateDevisDqeVariables`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:

```javascript
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
```
### Return Type
Recall that calling the `CreateDevisDqe` Mutation hook function returns a `UseMutationResult` object. This object holds the state of your Mutation, including whether the Mutation is loading, has completed, or has succeeded/failed, among other things.

To check the status of a Mutation, use the `UseMutationResult.status` field. You can also check for pending / success / error status using the `UseMutationResult.isPending`, `UseMutationResult.isSuccess`, and `UseMutationResult.isError` fields.

To execute the Mutation, call `UseMutationResult.mutate()`. This function executes the Mutation, but does not return the data from the Mutation.

To access the data returned by a Mutation, use the `UseMutationResult.data` field. The data for the `CreateDevisDqe` Mutation is of type `CreateDevisDqeData`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface CreateDevisDqeData {
  devisDqe_insert: DevisDqe_Key;
}
```

To learn more about the `UseMutationResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useMutation).

### Using `CreateDevisDqe`'s Mutation hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, CreateDevisDqeVariables } from '@dataconnect/generated';
import { useCreateDevisDqe } from '@dataconnect/generated/react'

export default function CreateDevisDqeComponent() {
  // Call the Mutation hook function to get a `UseMutationResult` object which holds the state of your Mutation.
  const mutation = useCreateDevisDqe();

  // You can also pass in a `DataConnect` instance to the Mutation hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const mutation = useCreateDevisDqe(dataConnect);

  // You can also pass in a `useDataConnectMutationOptions` object to the Mutation hook function.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useCreateDevisDqe(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectMutationOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useCreateDevisDqe(dataConnect, options);

  // After calling the Mutation hook function, you must call `UseMutationResult.mutate()` to execute the Mutation.
  // The `useCreateDevisDqe` Mutation requires an argument of type `CreateDevisDqeVariables`:
  const createDevisDqeVars: CreateDevisDqeVariables = {
    projetId: ..., 
    codeArticle: ..., // optional
    ifcGuid: ..., // optional
    niveauSpatial: ..., // optional
    quantiteIfcBrute: ..., 
    quantiteFacturable: ..., // optional
    quantiteExecutee: ..., // optional
    prixTotalHt: ..., // optional
    statutPrix: ..., // optional
  };
  mutation.mutate(createDevisDqeVars);
  // Variables can be defined inline as well.
  mutation.mutate({ projetId: ..., codeArticle: ..., ifcGuid: ..., niveauSpatial: ..., quantiteIfcBrute: ..., quantiteFacturable: ..., quantiteExecutee: ..., prixTotalHt: ..., statutPrix: ..., });

  // You can also pass in a `useDataConnectMutationOptions` object to `UseMutationResult.mutate()`.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  mutation.mutate(createDevisDqeVars, options);

  // Then, you can render your component dynamically based on the status of the Mutation.
  if (mutation.isPending) {
    return <div>Loading...</div>;
  }

  if (mutation.isError) {
    return <div>Error: {mutation.error.message}</div>;
  }

  // If the Mutation is successful, you can access the data returned using the `UseMutationResult.data` field.
  if (mutation.isSuccess) {
    console.log(mutation.data.devisDqe_insert);
  }
  return <div>Mutation execution {mutation.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## CreateMappingBimPrix
You can execute the `CreateMappingBimPrix` Mutation using the `UseMutationResult` object returned by the following Mutation hook function (which is defined in [dataconnect-generated/react/index.d.ts](./index.d.ts)):
```javascript
useCreateMappingBimPrix(options?: useDataConnectMutationOptions<CreateMappingBimPrixData, FirebaseError, CreateMappingBimPrixVariables>): UseDataConnectMutationResult<CreateMappingBimPrixData, CreateMappingBimPrixVariables>;
```
You can also pass in a `DataConnect` instance to the Mutation hook function.
```javascript
useCreateMappingBimPrix(dc: DataConnect, options?: useDataConnectMutationOptions<CreateMappingBimPrixData, FirebaseError, CreateMappingBimPrixVariables>): UseDataConnectMutationResult<CreateMappingBimPrixData, CreateMappingBimPrixVariables>;
```

### Variables
The `CreateMappingBimPrix` Mutation requires an argument of type `CreateMappingBimPrixVariables`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface CreateMappingBimPrixVariables {
  macroCodeBim: string;
  codeArticle: string;
  ratioConversion?: number | null;
}
```
### Return Type
Recall that calling the `CreateMappingBimPrix` Mutation hook function returns a `UseMutationResult` object. This object holds the state of your Mutation, including whether the Mutation is loading, has completed, or has succeeded/failed, among other things.

To check the status of a Mutation, use the `UseMutationResult.status` field. You can also check for pending / success / error status using the `UseMutationResult.isPending`, `UseMutationResult.isSuccess`, and `UseMutationResult.isError` fields.

To execute the Mutation, call `UseMutationResult.mutate()`. This function executes the Mutation, but does not return the data from the Mutation.

To access the data returned by a Mutation, use the `UseMutationResult.data` field. The data for the `CreateMappingBimPrix` Mutation is of type `CreateMappingBimPrixData`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface CreateMappingBimPrixData {
  mappingBimPrix_insert: MappingBimPrix_Key;
}
```

To learn more about the `UseMutationResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useMutation).

### Using `CreateMappingBimPrix`'s Mutation hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, CreateMappingBimPrixVariables } from '@dataconnect/generated';
import { useCreateMappingBimPrix } from '@dataconnect/generated/react'

export default function CreateMappingBimPrixComponent() {
  // Call the Mutation hook function to get a `UseMutationResult` object which holds the state of your Mutation.
  const mutation = useCreateMappingBimPrix();

  // You can also pass in a `DataConnect` instance to the Mutation hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const mutation = useCreateMappingBimPrix(dataConnect);

  // You can also pass in a `useDataConnectMutationOptions` object to the Mutation hook function.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useCreateMappingBimPrix(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectMutationOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useCreateMappingBimPrix(dataConnect, options);

  // After calling the Mutation hook function, you must call `UseMutationResult.mutate()` to execute the Mutation.
  // The `useCreateMappingBimPrix` Mutation requires an argument of type `CreateMappingBimPrixVariables`:
  const createMappingBimPrixVars: CreateMappingBimPrixVariables = {
    macroCodeBim: ..., 
    codeArticle: ..., 
    ratioConversion: ..., // optional
  };
  mutation.mutate(createMappingBimPrixVars);
  // Variables can be defined inline as well.
  mutation.mutate({ macroCodeBim: ..., codeArticle: ..., ratioConversion: ..., });

  // You can also pass in a `useDataConnectMutationOptions` object to `UseMutationResult.mutate()`.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  mutation.mutate(createMappingBimPrixVars, options);

  // Then, you can render your component dynamically based on the status of the Mutation.
  if (mutation.isPending) {
    return <div>Loading...</div>;
  }

  if (mutation.isError) {
    return <div>Error: {mutation.error.message}</div>;
  }

  // If the Mutation is successful, you can access the data returned using the `UseMutationResult.data` field.
  if (mutation.isSuccess) {
    console.log(mutation.data.mappingBimPrix_insert);
  }
  return <div>Mutation execution {mutation.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

