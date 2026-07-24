# Generated TypeScript README
This README will guide you through the process of using the generated JavaScript SDK package for the connector `example`. It will also provide examples on how to use your generated SDK to call your Data Connect queries and mutations.

**If you're looking for the `React README`, you can find it at [`dataconnect-generated/react/README.md`](./react/README.md)**

***NOTE:** This README is generated alongside the generated SDK. If you make changes to this file, they will be overwritten when the SDK is regenerated.*

# Table of Contents
- [**Overview**](#generated-javascript-readme)
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

# Accessing the connector
A connector is a collection of Queries and Mutations. One SDK is generated for each connector - this SDK is generated for the connector `example`. You can find more information about connectors in the [Data Connect documentation](https://firebase.google.com/docs/data-connect#how-does).

You can use this generated SDK by importing from the package `@dataconnect/generated` as shown below. Both CommonJS and ESM imports are supported.

You can also follow the instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#set-client).

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';

const dataConnect = getDataConnect(connectorConfig);
```

## Connecting to the local Emulator
By default, the connector will connect to the production service.

To connect to the emulator, you can use the following code.
You can also follow the emulator instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#instrument-clients).

```typescript
import { connectDataConnectEmulator, getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';

const dataConnect = getDataConnect(connectorConfig);
connectDataConnectEmulator(dataConnect, 'localhost', 9399);
```

After it's initialized, you can call your Data Connect [queries](#queries) and [mutations](#mutations) from your generated SDK.

# Queries

There are two ways to execute a Data Connect Query using the generated Web SDK:
- Using a Query Reference function, which returns a `QueryRef`
  - The `QueryRef` can be used as an argument to `executeQuery()`, which will execute the Query and return a `QueryPromise`
- Using an action shortcut function, which returns a `QueryPromise`
  - Calling the action shortcut function will execute the Query and return a `QueryPromise`

The following is true for both the action shortcut function and the `QueryRef` function:
- The `QueryPromise` returned will resolve to the result of the Query once it has finished executing
- If the Query accepts arguments, both the action shortcut function and the `QueryRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Query
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `example` connector's generated functions to execute each query. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-queries).

## GetProjetDqe
You can execute the `GetProjetDqe` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
getProjetDqe(vars: GetProjetDqeVariables, options?: ExecuteQueryOptions): QueryPromise<GetProjetDqeData, GetProjetDqeVariables>;

interface GetProjetDqeRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetProjetDqeVariables): QueryRef<GetProjetDqeData, GetProjetDqeVariables>;
}
export const getProjetDqeRef: GetProjetDqeRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getProjetDqe(dc: DataConnect, vars: GetProjetDqeVariables, options?: ExecuteQueryOptions): QueryPromise<GetProjetDqeData, GetProjetDqeVariables>;

interface GetProjetDqeRef {
  ...
  (dc: DataConnect, vars: GetProjetDqeVariables): QueryRef<GetProjetDqeData, GetProjetDqeVariables>;
}
export const getProjetDqeRef: GetProjetDqeRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getProjetDqeRef:
```typescript
const name = getProjetDqeRef.operationName;
console.log(name);
```

### Variables
The `GetProjetDqe` query requires an argument of type `GetProjetDqeVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetProjetDqeVariables {
  id: UUIDString;
}
```
### Return Type
Recall that executing the `GetProjetDqe` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetProjetDqeData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
### Using `GetProjetDqe`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getProjetDqe, GetProjetDqeVariables } from '@dataconnect/generated';

// The `GetProjetDqe` query requires an argument of type `GetProjetDqeVariables`:
const getProjetDqeVars: GetProjetDqeVariables = {
  id: ..., 
};

// Call the `getProjetDqe()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getProjetDqe(getProjetDqeVars);
// Variables can be defined inline as well.
const { data } = await getProjetDqe({ id: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getProjetDqe(dataConnect, getProjetDqeVars);

console.log(data.projet);

// Or, you can use the `Promise` API.
getProjetDqe(getProjetDqeVars).then((response) => {
  const data = response.data;
  console.log(data.projet);
});
```

### Using `GetProjetDqe`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getProjetDqeRef, GetProjetDqeVariables } from '@dataconnect/generated';

// The `GetProjetDqe` query requires an argument of type `GetProjetDqeVariables`:
const getProjetDqeVars: GetProjetDqeVariables = {
  id: ..., 
};

// Call the `getProjetDqeRef()` function to get a reference to the query.
const ref = getProjetDqeRef(getProjetDqeVars);
// Variables can be defined inline as well.
const ref = getProjetDqeRef({ id: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getProjetDqeRef(dataConnect, getProjetDqeVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.projet);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.projet);
});
```

## ListProjets
You can execute the `ListProjets` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
listProjets(options?: ExecuteQueryOptions): QueryPromise<ListProjetsData, undefined>;

interface ListProjetsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListProjetsData, undefined>;
}
export const listProjetsRef: ListProjetsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listProjets(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListProjetsData, undefined>;

interface ListProjetsRef {
  ...
  (dc: DataConnect): QueryRef<ListProjetsData, undefined>;
}
export const listProjetsRef: ListProjetsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listProjetsRef:
```typescript
const name = listProjetsRef.operationName;
console.log(name);
```

### Variables
The `ListProjets` query has no variables.
### Return Type
Recall that executing the `ListProjets` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListProjetsData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListProjetsData {
  projets: ({
    id: UUIDString;
    nomProjet: string;
    localisation?: string | null;
    dateCreation: DateString;
  } & Projet_Key)[];
}
```
### Using `ListProjets`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listProjets } from '@dataconnect/generated';


// Call the `listProjets()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listProjets();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listProjets(dataConnect);

console.log(data.projets);

// Or, you can use the `Promise` API.
listProjets().then((response) => {
  const data = response.data;
  console.log(data.projets);
});
```

### Using `ListProjets`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listProjetsRef } from '@dataconnect/generated';


// Call the `listProjetsRef()` function to get a reference to the query.
const ref = listProjetsRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listProjetsRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.projets);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.projets);
});
```

## GetMercuriale
You can execute the `GetMercuriale` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
getMercuriale(options?: ExecuteQueryOptions): QueryPromise<GetMercurialeData, undefined>;

interface GetMercurialeRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetMercurialeData, undefined>;
}
export const getMercurialeRef: GetMercurialeRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getMercuriale(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<GetMercurialeData, undefined>;

interface GetMercurialeRef {
  ...
  (dc: DataConnect): QueryRef<GetMercurialeData, undefined>;
}
export const getMercurialeRef: GetMercurialeRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getMercurialeRef:
```typescript
const name = getMercurialeRef.operationName;
console.log(name);
```

### Variables
The `GetMercuriale` query has no variables.
### Return Type
Recall that executing the `GetMercuriale` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetMercurialeData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
### Using `GetMercuriale`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getMercuriale } from '@dataconnect/generated';


// Call the `getMercuriale()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getMercuriale();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getMercuriale(dataConnect);

console.log(data.mercurialePrixes);

// Or, you can use the `Promise` API.
getMercuriale().then((response) => {
  const data = response.data;
  console.log(data.mercurialePrixes);
});
```

### Using `GetMercuriale`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getMercurialeRef } from '@dataconnect/generated';


// Call the `getMercurialeRef()` function to get a reference to the query.
const ref = getMercurialeRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getMercurialeRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.mercurialePrixes);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.mercurialePrixes);
});
```

## GetMappingBim
You can execute the `GetMappingBim` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
getMappingBim(vars: GetMappingBimVariables, options?: ExecuteQueryOptions): QueryPromise<GetMappingBimData, GetMappingBimVariables>;

interface GetMappingBimRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetMappingBimVariables): QueryRef<GetMappingBimData, GetMappingBimVariables>;
}
export const getMappingBimRef: GetMappingBimRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getMappingBim(dc: DataConnect, vars: GetMappingBimVariables, options?: ExecuteQueryOptions): QueryPromise<GetMappingBimData, GetMappingBimVariables>;

interface GetMappingBimRef {
  ...
  (dc: DataConnect, vars: GetMappingBimVariables): QueryRef<GetMappingBimData, GetMappingBimVariables>;
}
export const getMappingBimRef: GetMappingBimRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getMappingBimRef:
```typescript
const name = getMappingBimRef.operationName;
console.log(name);
```

### Variables
The `GetMappingBim` query requires an argument of type `GetMappingBimVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetMappingBimVariables {
  macroCodeBim: string;
}
```
### Return Type
Recall that executing the `GetMappingBim` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetMappingBimData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
### Using `GetMappingBim`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getMappingBim, GetMappingBimVariables } from '@dataconnect/generated';

// The `GetMappingBim` query requires an argument of type `GetMappingBimVariables`:
const getMappingBimVars: GetMappingBimVariables = {
  macroCodeBim: ..., 
};

// Call the `getMappingBim()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getMappingBim(getMappingBimVars);
// Variables can be defined inline as well.
const { data } = await getMappingBim({ macroCodeBim: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getMappingBim(dataConnect, getMappingBimVars);

console.log(data.mappingBimPrixes);

// Or, you can use the `Promise` API.
getMappingBim(getMappingBimVars).then((response) => {
  const data = response.data;
  console.log(data.mappingBimPrixes);
});
```

### Using `GetMappingBim`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getMappingBimRef, GetMappingBimVariables } from '@dataconnect/generated';

// The `GetMappingBim` query requires an argument of type `GetMappingBimVariables`:
const getMappingBimVars: GetMappingBimVariables = {
  macroCodeBim: ..., 
};

// Call the `getMappingBimRef()` function to get a reference to the query.
const ref = getMappingBimRef(getMappingBimVars);
// Variables can be defined inline as well.
const ref = getMappingBimRef({ macroCodeBim: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getMappingBimRef(dataConnect, getMappingBimVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.mappingBimPrixes);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.mappingBimPrixes);
});
```

# Mutations

There are two ways to execute a Data Connect Mutation using the generated Web SDK:
- Using a Mutation Reference function, which returns a `MutationRef`
  - The `MutationRef` can be used as an argument to `executeMutation()`, which will execute the Mutation and return a `MutationPromise`
- Using an action shortcut function, which returns a `MutationPromise`
  - Calling the action shortcut function will execute the Mutation and return a `MutationPromise`

The following is true for both the action shortcut function and the `MutationRef` function:
- The `MutationPromise` returned will resolve to the result of the Mutation once it has finished executing
- If the Mutation accepts arguments, both the action shortcut function and the `MutationRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Mutation
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `example` connector's generated functions to execute each mutation. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-mutations).

## CreateProjet
You can execute the `CreateProjet` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
createProjet(vars: CreateProjetVariables): MutationPromise<CreateProjetData, CreateProjetVariables>;

interface CreateProjetRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateProjetVariables): MutationRef<CreateProjetData, CreateProjetVariables>;
}
export const createProjetRef: CreateProjetRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createProjet(dc: DataConnect, vars: CreateProjetVariables): MutationPromise<CreateProjetData, CreateProjetVariables>;

interface CreateProjetRef {
  ...
  (dc: DataConnect, vars: CreateProjetVariables): MutationRef<CreateProjetData, CreateProjetVariables>;
}
export const createProjetRef: CreateProjetRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createProjetRef:
```typescript
const name = createProjetRef.operationName;
console.log(name);
```

### Variables
The `CreateProjet` mutation requires an argument of type `CreateProjetVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateProjetVariables {
  nomProjet: string;
  localisation?: string | null;
  description?: string | null;
  fraisGenerauxPct?: number | null;
  margeAleasPct?: number | null;
}
```
### Return Type
Recall that executing the `CreateProjet` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateProjetData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateProjetData {
  projet_insert: Projet_Key;
}
```
### Using `CreateProjet`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createProjet, CreateProjetVariables } from '@dataconnect/generated';

// The `CreateProjet` mutation requires an argument of type `CreateProjetVariables`:
const createProjetVars: CreateProjetVariables = {
  nomProjet: ..., 
  localisation: ..., // optional
  description: ..., // optional
  fraisGenerauxPct: ..., // optional
  margeAleasPct: ..., // optional
};

// Call the `createProjet()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createProjet(createProjetVars);
// Variables can be defined inline as well.
const { data } = await createProjet({ nomProjet: ..., localisation: ..., description: ..., fraisGenerauxPct: ..., margeAleasPct: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createProjet(dataConnect, createProjetVars);

console.log(data.projet_insert);

// Or, you can use the `Promise` API.
createProjet(createProjetVars).then((response) => {
  const data = response.data;
  console.log(data.projet_insert);
});
```

### Using `CreateProjet`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createProjetRef, CreateProjetVariables } from '@dataconnect/generated';

// The `CreateProjet` mutation requires an argument of type `CreateProjetVariables`:
const createProjetVars: CreateProjetVariables = {
  nomProjet: ..., 
  localisation: ..., // optional
  description: ..., // optional
  fraisGenerauxPct: ..., // optional
  margeAleasPct: ..., // optional
};

// Call the `createProjetRef()` function to get a reference to the mutation.
const ref = createProjetRef(createProjetVars);
// Variables can be defined inline as well.
const ref = createProjetRef({ nomProjet: ..., localisation: ..., description: ..., fraisGenerauxPct: ..., margeAleasPct: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createProjetRef(dataConnect, createProjetVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.projet_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.projet_insert);
});
```

## UpsertMercurialePrix
You can execute the `UpsertMercurialePrix` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
upsertMercurialePrix(vars: UpsertMercurialePrixVariables): MutationPromise<UpsertMercurialePrixData, UpsertMercurialePrixVariables>;

interface UpsertMercurialePrixRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpsertMercurialePrixVariables): MutationRef<UpsertMercurialePrixData, UpsertMercurialePrixVariables>;
}
export const upsertMercurialePrixRef: UpsertMercurialePrixRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
upsertMercurialePrix(dc: DataConnect, vars: UpsertMercurialePrixVariables): MutationPromise<UpsertMercurialePrixData, UpsertMercurialePrixVariables>;

interface UpsertMercurialePrixRef {
  ...
  (dc: DataConnect, vars: UpsertMercurialePrixVariables): MutationRef<UpsertMercurialePrixData, UpsertMercurialePrixVariables>;
}
export const upsertMercurialePrixRef: UpsertMercurialePrixRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the upsertMercurialePrixRef:
```typescript
const name = upsertMercurialePrixRef.operationName;
console.log(name);
```

### Variables
The `UpsertMercurialePrix` mutation requires an argument of type `UpsertMercurialePrixVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
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
Recall that executing the `UpsertMercurialePrix` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `UpsertMercurialePrixData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface UpsertMercurialePrixData {
  mercurialePrix_upsert: MercurialePrix_Key;
}
```
### Using `UpsertMercurialePrix`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, upsertMercurialePrix, UpsertMercurialePrixVariables } from '@dataconnect/generated';

// The `UpsertMercurialePrix` mutation requires an argument of type `UpsertMercurialePrixVariables`:
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

// Call the `upsertMercurialePrix()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await upsertMercurialePrix(upsertMercurialePrixVars);
// Variables can be defined inline as well.
const { data } = await upsertMercurialePrix({ codeArticle: ..., nomMateriau: ..., designation: ..., unite: ..., prixUnitaireFourniture: ..., prixUnitaireMainOeuvre: ..., categorieLot: ..., prixTotalUnitaire: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await upsertMercurialePrix(dataConnect, upsertMercurialePrixVars);

console.log(data.mercurialePrix_upsert);

// Or, you can use the `Promise` API.
upsertMercurialePrix(upsertMercurialePrixVars).then((response) => {
  const data = response.data;
  console.log(data.mercurialePrix_upsert);
});
```

### Using `UpsertMercurialePrix`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, upsertMercurialePrixRef, UpsertMercurialePrixVariables } from '@dataconnect/generated';

// The `UpsertMercurialePrix` mutation requires an argument of type `UpsertMercurialePrixVariables`:
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

// Call the `upsertMercurialePrixRef()` function to get a reference to the mutation.
const ref = upsertMercurialePrixRef(upsertMercurialePrixVars);
// Variables can be defined inline as well.
const ref = upsertMercurialePrixRef({ codeArticle: ..., nomMateriau: ..., designation: ..., unite: ..., prixUnitaireFourniture: ..., prixUnitaireMainOeuvre: ..., categorieLot: ..., prixTotalUnitaire: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = upsertMercurialePrixRef(dataConnect, upsertMercurialePrixVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.mercurialePrix_upsert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.mercurialePrix_upsert);
});
```

## CreateDevisDqe
You can execute the `CreateDevisDqe` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
createDevisDqe(vars: CreateDevisDqeVariables): MutationPromise<CreateDevisDqeData, CreateDevisDqeVariables>;

interface CreateDevisDqeRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateDevisDqeVariables): MutationRef<CreateDevisDqeData, CreateDevisDqeVariables>;
}
export const createDevisDqeRef: CreateDevisDqeRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createDevisDqe(dc: DataConnect, vars: CreateDevisDqeVariables): MutationPromise<CreateDevisDqeData, CreateDevisDqeVariables>;

interface CreateDevisDqeRef {
  ...
  (dc: DataConnect, vars: CreateDevisDqeVariables): MutationRef<CreateDevisDqeData, CreateDevisDqeVariables>;
}
export const createDevisDqeRef: CreateDevisDqeRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createDevisDqeRef:
```typescript
const name = createDevisDqeRef.operationName;
console.log(name);
```

### Variables
The `CreateDevisDqe` mutation requires an argument of type `CreateDevisDqeVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
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
Recall that executing the `CreateDevisDqe` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateDevisDqeData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateDevisDqeData {
  devisDqe_insert: DevisDqe_Key;
}
```
### Using `CreateDevisDqe`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createDevisDqe, CreateDevisDqeVariables } from '@dataconnect/generated';

// The `CreateDevisDqe` mutation requires an argument of type `CreateDevisDqeVariables`:
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

// Call the `createDevisDqe()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createDevisDqe(createDevisDqeVars);
// Variables can be defined inline as well.
const { data } = await createDevisDqe({ projetId: ..., codeArticle: ..., ifcGuid: ..., niveauSpatial: ..., quantiteIfcBrute: ..., quantiteFacturable: ..., quantiteExecutee: ..., prixTotalHt: ..., statutPrix: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createDevisDqe(dataConnect, createDevisDqeVars);

console.log(data.devisDqe_insert);

// Or, you can use the `Promise` API.
createDevisDqe(createDevisDqeVars).then((response) => {
  const data = response.data;
  console.log(data.devisDqe_insert);
});
```

### Using `CreateDevisDqe`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createDevisDqeRef, CreateDevisDqeVariables } from '@dataconnect/generated';

// The `CreateDevisDqe` mutation requires an argument of type `CreateDevisDqeVariables`:
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

// Call the `createDevisDqeRef()` function to get a reference to the mutation.
const ref = createDevisDqeRef(createDevisDqeVars);
// Variables can be defined inline as well.
const ref = createDevisDqeRef({ projetId: ..., codeArticle: ..., ifcGuid: ..., niveauSpatial: ..., quantiteIfcBrute: ..., quantiteFacturable: ..., quantiteExecutee: ..., prixTotalHt: ..., statutPrix: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createDevisDqeRef(dataConnect, createDevisDqeVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.devisDqe_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.devisDqe_insert);
});
```

## CreateMappingBimPrix
You can execute the `CreateMappingBimPrix` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
createMappingBimPrix(vars: CreateMappingBimPrixVariables): MutationPromise<CreateMappingBimPrixData, CreateMappingBimPrixVariables>;

interface CreateMappingBimPrixRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateMappingBimPrixVariables): MutationRef<CreateMappingBimPrixData, CreateMappingBimPrixVariables>;
}
export const createMappingBimPrixRef: CreateMappingBimPrixRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createMappingBimPrix(dc: DataConnect, vars: CreateMappingBimPrixVariables): MutationPromise<CreateMappingBimPrixData, CreateMappingBimPrixVariables>;

interface CreateMappingBimPrixRef {
  ...
  (dc: DataConnect, vars: CreateMappingBimPrixVariables): MutationRef<CreateMappingBimPrixData, CreateMappingBimPrixVariables>;
}
export const createMappingBimPrixRef: CreateMappingBimPrixRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createMappingBimPrixRef:
```typescript
const name = createMappingBimPrixRef.operationName;
console.log(name);
```

### Variables
The `CreateMappingBimPrix` mutation requires an argument of type `CreateMappingBimPrixVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateMappingBimPrixVariables {
  macroCodeBim: string;
  codeArticle: string;
  ratioConversion?: number | null;
}
```
### Return Type
Recall that executing the `CreateMappingBimPrix` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateMappingBimPrixData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateMappingBimPrixData {
  mappingBimPrix_insert: MappingBimPrix_Key;
}
```
### Using `CreateMappingBimPrix`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createMappingBimPrix, CreateMappingBimPrixVariables } from '@dataconnect/generated';

// The `CreateMappingBimPrix` mutation requires an argument of type `CreateMappingBimPrixVariables`:
const createMappingBimPrixVars: CreateMappingBimPrixVariables = {
  macroCodeBim: ..., 
  codeArticle: ..., 
  ratioConversion: ..., // optional
};

// Call the `createMappingBimPrix()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createMappingBimPrix(createMappingBimPrixVars);
// Variables can be defined inline as well.
const { data } = await createMappingBimPrix({ macroCodeBim: ..., codeArticle: ..., ratioConversion: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createMappingBimPrix(dataConnect, createMappingBimPrixVars);

console.log(data.mappingBimPrix_insert);

// Or, you can use the `Promise` API.
createMappingBimPrix(createMappingBimPrixVars).then((response) => {
  const data = response.data;
  console.log(data.mappingBimPrix_insert);
});
```

### Using `CreateMappingBimPrix`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createMappingBimPrixRef, CreateMappingBimPrixVariables } from '@dataconnect/generated';

// The `CreateMappingBimPrix` mutation requires an argument of type `CreateMappingBimPrixVariables`:
const createMappingBimPrixVars: CreateMappingBimPrixVariables = {
  macroCodeBim: ..., 
  codeArticle: ..., 
  ratioConversion: ..., // optional
};

// Call the `createMappingBimPrixRef()` function to get a reference to the mutation.
const ref = createMappingBimPrixRef(createMappingBimPrixVars);
// Variables can be defined inline as well.
const ref = createMappingBimPrixRef({ macroCodeBim: ..., codeArticle: ..., ratioConversion: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createMappingBimPrixRef(dataConnect, createMappingBimPrixVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.mappingBimPrix_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.mappingBimPrix_insert);
});
```

