### TableEnki - Módulo de tabelas para o quilljs

Esse módulo é uma extensão do ([quill-better-table](https://github.com/soccerloway/quill-better-table)) com algumas correções e atualizações.

## Como utilizar?

Instale a dependência em sua aplicação:

```
npm i @encontactlabs/quill-table@latest 

ou

yarn add @encontactlabs/quill-table@latest
```

após a dependência ser instalada importe ela no topo arquivo ajuntamente com os seus estilos:

```
  import QuillBetterTable from '@encontactlabs/quill-table;
  import '@encontactlabs/quill-table/dist/quill-better-table.css';
```


Em seguida, registre o módulo: 

```
  Quill.register({
   'modules/better-table': QuillBetterTable,
  })
```


Por fim configure o módulo na instância do seu Quill:


```
modules: {
  table: false,
  'better-table': {
 operationMenu: {
    items: {
       unmergeCells: {
       text: 'Another unmerge cells name',
      },
    },
  color: {
      colors: ['green', 'red', 'yellow', 'blue', 'white'],
      text: 'Background Colors:',
    },
   },
  },
}
```


####  Caso tenha alguma dificuldade você pode seguir o mesmo processo de configuração do ([quill-better-table](https://github.com/soccerloway/quill-better-table)) ! 

