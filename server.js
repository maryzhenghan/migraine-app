'use strict';

const express = require('express');
const app = express();

const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const { PORT, DATABASE_URL } = require('./config');
const { Log } = require('./models');

app.use(express.static('public'));
app.use(bodyParser.json());


app.get('/home', (req, res) => {
	res.status(200).json({ message: 'You have arrived on the Migraine App home page' });
});

app.get('/history', (req, res) => {
	res.status(200).json({ message: 'You have arrived on the Migraine App history page' });
});

// limits to the first 5 logs
app.get('/logs', (req, res) => {
	Log
		.find()
		.limit( 5 )
		.then(logs => {
			res.json({
				logs: logs.map(
					(logs) => log.serialize())
			});
		})
		.catch(err => {
			console.error(err);
			res.status(500).json({ message: 'Internal server error' });
		});
});

// request log by ID
app.get('/logs/:id', (req, res) => {
	Log
		.findById(req.params.id)
		.then(log => res.json(log.serialize()))
		.catch(err => {
			console.error(err);
			res.status(500).json({ message: 'Internal server error' });
		});
});


app.post('/logs', (req, res) => {
	const requiredFields = ['date', 'migraineLengthHr'];

	for (let i = 0; i < requiredFields.length; i++) {
		const field = requiredFields[i];
		if (!(field in req.body)) {
			const message = `Missing \`${field}\` in request body`;
			console.error(message);
			return res.status(400).send(message);
		}
	}

	Log
		.create({
			date: req.body.date,
			migraineLengthHr: req.body.migraineLengthHr,
			water: req.body.water,
			skippedMeals: req.body.skippedMeals,
			sleepStartHr: req.body.sleepStartHr,
			sleepStartMin: req.body.sleepStartMin,
			sleepEndHr: req.body.sleepEndHr,
			sleepEndMin: req.body.sleepEndMin,
			notes: req.body.notes
		})
		.then(log => res.status(201).json(log.serialize()))
		.catch(err => {
			console.error(err);
			res.status(500).json({ message: 'Internal server error' });
		});
});


app.put('/logs/:id', (req, res) => {
	// check if id in request path and request body match
	if (!(req.params.id && req.body.id && req.params.id === req.body.id)) {
		const message = (
			`Request path id (${req.params.id}) and request body id ` +
			`(${req.body.id} must match`);
		console.error(message);
		return res.status(400).json({ message: message });
	}

	const toUpdate = {};
	const updateableFields = ['date', 'migraineLengthHr', 'water', 'skippedMeals', 'sleepStartHr', 'sleepStartMin', 'sleepEndHr', 'sleepEndMin', 'notes'];

	updateableFields.forEach(field => {
		if (field in req.body) {
			toUpdate[field] = req.body[field];
		}
	});

	Log
		.findbyIdAndUpdate(req.params.id, { $set: toUpdate })
		.then(log => res.status(204).end())
		.catch(err => {
			console.error(err);
			res.status(500).json({ message: 'Internal server error' });
});


app.delete('/logs/:id', (req, res) => {
	Log
		.findByIdAndRemove(req.params.id)
		.then(log => res.status(204).end())
		.catch(err => {
			console.error(err);
			res.status(500).json({ message: 'Internal server error' });
});


// catch-all endpoint if client makes request to non-existent endpoint
app.use('*', function(req, res) {
	res.status(404).json({ message: 'Not Found' });
});


let server;

function runServer(databaseUrl, port = PORT) {
	return new Promise((resolve, reject) => {
		mongoose.connect(databaseUrl, err => {
			if (err) {
				return reject(err);
			}
			server = app.listen(port, () => {
				console.log(`Your app is listening on port ${port}`);
				resolve();
			})
				.on('error', err => {
					mongoose.disconnect();
					reject(err);
				});
		});
	});
}

function closeServer() {
	return mongoose.disconnect().then(() => {
		return new Promise((resolve, reject) => {
			console.log('Closing server');
			server.close(err => {
				if (err) {
					return reject(err);
				}
				resolve();
			});
		});
	});
}

if (require.main === module) {
	runServer(DATABASE_URL).catch(err => console.error(err));
}

module.exports = { app, runServer, closeServer };