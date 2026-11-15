# شیش — MVP learning application

German lesson runtime built with Next.js, HeroUIv3, TypeScript and PostgreSQL. Classroom playback, server-graded exercises, weighted progression, mistake review, guest history/import, mock authentication, profile and TEST_ONLY checkout are connected end to end.

Start from [local development](docs/DEVELOPMENT.md), [execution status](docs/reports/mvp/STATUS.md), [Blueprints](docs/blueprints/README.md) and [execution policy](docs/MVP_EXECUTION_POLICY.md). On Windows, run `./start.ps1`: it installs dependencies when needed, prepares local SQLite and starts the app on port3000 without Docker/PostgreSQL installation. Node24+ is required. PostgreSQL remains the Production database. `/sandbox` preserves original components/FSMs and adds connected template QC stories.

Local SQLite uses a separate ignored profile/file and preserves existing PostgreSQL configuration/data. See the [local quick start](docs/LOCAL_START.md).

This checkout contains a functional development MVP with3 synthetic published lessons and57 unpublished metadata slots. Real SMS/payment, final scoring/content, private production asset storage, hosting/privacy and visual/device signoff remain release gates. No operational launch is claimed. See [release gates](docs/reports/mvp/RELEASE_GATES.md).

MIT license inherited from the original Next.js/HeroUI template; original synthetic media licensing is in public/demo/LICENSE.md.
