#!/usr/bin/env node
import React from 'react';
import {render} from 'ink';
import meow from 'meow';
import App from './app.js';
import { withFullScreen } from "fullscreen-ink";

const cli = meow(
	`
		Usage
		  $ TUI

		Options
			--name  Your name

		Examples
		  $ TUI --name=Jane
		  Hello, Jane
	`,
	{
		importMeta: import.meta,
	},
);

withFullScreen(<App />, { exitOnCtrlC: true }).start();
