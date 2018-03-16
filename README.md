# js.tensorflow.org

This repo is for the website for TensorFlow.js. The site is built using Hexo (a static site generator) that puts static assets in to the `public` folder.

## Development Setup

You need node.js, yarn, and git to use this repo effectively. Note that it clones the repos for tfjs-core and tfjs-layers (as git submodules) in order to build API docs.

After checking out this repo run

```
yarn prep
```

This will download the two git submodules (or if you have already downloaded them before **will pull down changes from master**) and then install the project dependencies. `yarn prep` does the following: ``. Once this is done run

```
yarn serve
```

To start a dev server for the site. You should be able to make changes to the site and see them reflected in the dev server

When you pull new commits from git you should run `yarn prep` again.

## Making Changes

There are two broad classes of changes you might want to make, site content/design and API documentation changes.

### Site Content/Design

Page layouts are stored in a custom hexo theme in the `themes/dljs` folder. This is also where JavaScript that will be included in pages is stored. Page content is written in markdown and stored in the `source` folder (though pages with complex layout define most of their content in a layout file).

Changing files in these two locations should immediately be reflected in the dev server when using `yarn serve`.

### API Documentation

Updating the API docs is a bit more involved as they are built from the sources of tfjs-core and tfjs-layers. The template for api docs is `api.hbs` and each version of the docs has a corresponding folder in `_data`. Files in `_data` are automatically generated and shouldn't be edited.

NOTE: Currently skeleton.json is in _data and will be moved out. See https://github.com/tensorflow/tfjs-website/issues/16 for details.

To edit the docs and see changes reflected in the site you can edit the repositories that are located in `libs`. Note that these submodules behave like *regular git repositories* and have an origin pointing to the canonical repository for `tfjs-core` and `tfjs-layers`. Making an API doc change involves making a commit to the subproject repo and to this one. You may need to add a new git remote in the submodule if you want to make a PR from a fork of tfjs-website repo. Make sure to do `git checkout master` or make a new branch for your changes.

Once you make an edit to the JSDoc for a submodule run

```
yarn build-api
```

To regenerate the API json.

**Note:** Right now docs build off of master for the two branches. This is going to change, they will in future default to build off of the specific tag indicated by the package.json of tfjs. There will be an option to override this to build off of master. So this step is subject to change (it will have more options) once the npm repos have stabilized.

Refreshing the page on the website should allow you to see your changes. You may need restart the dev server if you are generating a new version of the docs.

Once the your changes have been accepted into the repo in question (either tfjs-core or tfjs-layers), you can run `yarn prep` again in this repo (tfjs-website) to sync everything up (pull the most recent commits from master for each). You can then commit the **new submodule info** in the tfjs-website repo.


### Deployment

To build the site run

```
yarn build
```

We use firebase to deploy the site, this is a WIP so I will update this section soon.
