# Basic Usage

Always prioritize using a supported framework over using the generated SDK
directly. Supported frameworks simplify the developer experience and help ensure
best practices are followed.




### React
For each operation, there is a wrapper hook that can be used to call the operation.

Here are all of the hooks that get generated:
```ts
import { useCreateProjet, useUpsertMercurialePrix, useCreateDevisDqe, useCreateMappingBimPrix, useGetProjetDqe, useListProjets, useGetMercuriale, useGetMappingBim } from '@dataconnect/generated/react';
// The types of these hooks are available in react/index.d.ts

const { data, isPending, isSuccess, isError, error } = useCreateProjet(createProjetVars);

const { data, isPending, isSuccess, isError, error } = useUpsertMercurialePrix(upsertMercurialePrixVars);

const { data, isPending, isSuccess, isError, error } = useCreateDevisDqe(createDevisDqeVars);

const { data, isPending, isSuccess, isError, error } = useCreateMappingBimPrix(createMappingBimPrixVars);

const { data, isPending, isSuccess, isError, error } = useGetProjetDqe(getProjetDqeVars);

const { data, isPending, isSuccess, isError, error } = useListProjets();

const { data, isPending, isSuccess, isError, error } = useGetMercuriale();

const { data, isPending, isSuccess, isError, error } = useGetMappingBim(getMappingBimVars);

```

Here's an example from a different generated SDK:

```ts
import { useListAllMovies } from '@dataconnect/generated/react';

function MyComponent() {
  const { isLoading, data, error } = useListAllMovies();
  if(isLoading) {
    return <div>Loading...</div>
  }
  if(error) {
    return <div> An Error Occurred: {error} </div>
  }
}

// App.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MyComponent from './my-component';

function App() {
  const queryClient = new QueryClient();
  return <QueryClientProvider client={queryClient}>
    <MyComponent />
  </QueryClientProvider>
}
```



## Advanced Usage
If a user is not using a supported framework, they can use the generated SDK directly.

Here's an example of how to use it with the first 5 operations:

```js
import { createProjet, upsertMercurialePrix, createDevisDqe, createMappingBimPrix, getProjetDqe, listProjets, getMercuriale, getMappingBim } from '@dataconnect/generated';


// Operation CreateProjet:  For variables, look at type CreateProjetVars in ../index.d.ts
const { data } = await CreateProjet(dataConnect, createProjetVars);

// Operation UpsertMercurialePrix:  For variables, look at type UpsertMercurialePrixVars in ../index.d.ts
const { data } = await UpsertMercurialePrix(dataConnect, upsertMercurialePrixVars);

// Operation CreateDevisDqe:  For variables, look at type CreateDevisDqeVars in ../index.d.ts
const { data } = await CreateDevisDqe(dataConnect, createDevisDqeVars);

// Operation CreateMappingBimPrix:  For variables, look at type CreateMappingBimPrixVars in ../index.d.ts
const { data } = await CreateMappingBimPrix(dataConnect, createMappingBimPrixVars);

// Operation GetProjetDqe:  For variables, look at type GetProjetDqeVars in ../index.d.ts
const { data } = await GetProjetDqe(dataConnect, getProjetDqeVars);

// Operation ListProjets: 
const { data } = await ListProjets(dataConnect);

// Operation GetMercuriale: 
const { data } = await GetMercuriale(dataConnect);

// Operation GetMappingBim:  For variables, look at type GetMappingBimVars in ../index.d.ts
const { data } = await GetMappingBim(dataConnect, getMappingBimVars);


```