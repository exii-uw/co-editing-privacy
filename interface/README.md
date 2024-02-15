# Co-Editing Privacy

The interface for co-editing privacy project.

# Install

The project requires NPM, [NodeJS](https://nodejs.org) and [MongoDB](https://www.mongodb.com/download-center/community) to be installed (npm usually comes with node).

The other nodejs dependencies are installed in 'node_modules' folder. 
Note: update modules may cause errors because of outdated packages.


# Start

The project requires three components to work:

1. The assets folder including images,
2. The database,
3. A web server that both server the static files (.html, .js) and connects to
   the database to record the logs.

Currently the webpage is nothing more than a demo that prints the events as they arrive.

## Assets

Put images folder inside the assets folder, run the designExperiment program to produce the experiment design.

## Database

### Configuration

The database is configured using the `db-config.yaml` file at the root of the repository.

### Initialization (first time)

To run the database for the first time, run from the project directory:

```sh
mkdir db  # Create mongodb's directory.
npm run start:db-unsafe  # Start the database WITHOUT AUTHENTICATION.
```

This command start mongo db without any authentication. It is requires since no
users have been created yet, but intrinsically insecure.

If you get an error (code 48): change the port in `db-config.yaml` (the error occurs if the specified port is currently in use).

You will also need to update the `package.json` file to use the specified port number:

```"start:db-unsafe": "mongod --noscripting --dbpath db --bind_ip 127.0.0.1 --port <NEW PORT NUMBER>"```

Then in another terminal run:
```sh
npm run setup:db  # Create users and initial topology.
```

After this, you should stop the database (ctrl+c in the database directory) and
restart it with authentication enabled.

### Normal usage

After initialization, the database can be run with the following command:

```sh
npm run start:db
```

### Looking at the data

The easiest way to explore the data that is logged is to use
[MongoDB Compass](https://www.mongodb.com/products/compass).

It is highly recommended that you only connect as a reader to avoid altering the
data. Credentials can be found in `db-config.yaml`.


## Web server

The webpage needs to be bundled before consumption by a browser.

The database needs to be started before starting the webserver.

### Production

For production, it is better to bundle the page once and for all then serve the result as static files.

Use the following commands to bundle then serve the page:

```sh
npm run build  # Bundle all pages in /dist.
npm run start:prod
```
