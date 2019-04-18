This directory contains the following Google Cloud Functions.

### `trigger_nightly`
Programatically triggers a Cloud Build on master. This function is called by the Cloud Scheduler around 4:30am EST every day (configurable via the Cloud Scheduler UI).
You can also trigger the function manually via the Cloud UI.

Command to re-deploy:
```sh
gcloud functions deploy nightly_tfjs_website \
  --runtime nodejs8 \
  --trigger-topic nightly_tfjs_website
```

If a build was triggered by nightly, there is a substitution variable `_NIGHTLY=true`.
The substitution gets forwarded as the `NIGHTLY` environment variable so the scripts can use it, by specifying `env: ['NIGHTLY=$_NIGHTLY']` in `cloudbuild.yml`.
