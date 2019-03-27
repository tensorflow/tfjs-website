# API Doc Generator Guide

Note: this is documentation for the scripts that are used in this repo to
generate the API pages (https://js.tensorflow.org/api/latest)

## Introduction

In addition to the content of the website that is stored in this repository,
the website also serves up API documentation for the **tfjs union package.**
This is typically visible at https://js.tensorflow.org/api/latest (replace
'latest' with a version number to get docs for that version).

## Build Overview

The main script used to build the api docs is `node build-scripts/build-api.ts`.
This script depends on the existence of the union package existing in node_modules
and the _constituent repos of the union package_ exising as **git submodules** in
the **libs** folder.

This script does the following things (please refer to the script for details):

1. Get the versions of constituent packages of union packages (e.g. core or layers).
2. In `libs` folder, check out a tag that corresponds to the version above.
3. Run the `doc generator` on each individual package. This will output a json of
   symbols and their docs.
4. Merge all the generated jsons into one json file that represents all the docs.
5. Update the manifest file (records all published version in order)
6. Creates a new 'template' file that the site generator will use to render that
   version of the docs

## Adding a new package to the docs.

1. Add the package to the union package.
2. Add the repository for that package as a submodule in the `libs` folder of this repo.
    - The command you want is `git submodule add [repository-path] libs/` assuming you are running this from the root folder of the repo.
    - See https://chrisjean.com/git-submodules-adding-using-removing-and-updating/ for a handy guide and https://git-scm.com/book/en/v2/Git-Tools-Submodules for full docs on git submodules.
3. Update `build-api.js` to include your new lib in the `libs` array. You will need to read
   the version for that new dependency in a similar way to the others.
4. Run yarn prep.
5. Run yarn build-prod to test that it works.
6. Run yarn serve to preview your changes.
7. Make a pull request with these changes.

## Adding docs to your new package

The doc generator will scan your repo for symbols that have the appropriate annotation.

These consist of jsdocs that are followed by an annotation like the following  [`/** @doc {heading: 'Tensors', subheading: 'Classes'} */`](https://github.com/tensorflow/tfjs-core/blob/master/src/tensor.ts#L35). Note that
the

We don't currently statically limit the headings and subheadings, but we do try and keep them organized. If you are adding a new one, you should edit `source/_data/skeleton.json` to add descriptions of these sections, you can also use the `pin` attribute to specify order for certain symbols you want to appear first in the docs.

