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

To edit the docs and see changes reflected in the site you can edit the repositories that are located in `libs`. Note that these submodules behave like *regular git repositories* and have an origin pointing to the canonical repository for `tfjs-core` and `tfjs-layers`. Making an API doc change involves making a commit to the subproject repo and to this one. You may need to add a new git remote in the submodule if you want to make a PR from a fork of tfjs-website repo. Make sure to do `git checkout master` or make a new branch for your changes.

There are two ways to regenerate the docs json.

During local development (e.g. if you have changes in libs), run:

```
yarn build-api
```

This will build a version of the api known as `local`. It will be accessible at `http://localhost:4000/api/local/`. This content is not checked in, nor is it linked to
anywhere on the site, but it is suitable for testing changes to docs.

Once the your changes have been accepted into the repo in question (either tfjs-core or tfjs-layers), you can run `yarn prep` again in this repo (tfjs-website) to sync everything up (pull the most recent commits from master for each). You can then commit the **new submodule info** in the tfjs-website repo.

Once you are done you can do a full production build of the site using:

```
yarn build-prod
```

Note that this command will do a number of things that will **modify your working tree**. Its purpose is to build a new production build suitable for deployment to the site, as such it only builds docs that are in a released version of tfjs-layers and tfjs-core. The version it builds is driven off of the `@tensorflow/tfjs` dependency in package.json. **Build prod cannot build your local doc changes into the site**. To do this it will do a checkout of `libs/tfjs-core` and `libs/tfjs-layers` that correspond to the dependencies listed for `@tensorflow/tfjs`. This will modify your working tree (in libs).

In both these cases starting the dev server and refreshing the page should allow you to see changes.

In addition to `http://localhost:4000/api/local/`, the build also provides `http://localhost:4000/api/latest/` which points to the last **production** version of the docs that have been built. `latest` will never point to `local`


### Deployment

To build the site run

```
yarn build-prod
```

Deployment instructions are available internally. Contact @tafsiri for access. (Googlers only)
