#!/usr/bin/env node
/**
 * GSD Dialog CLI
 * 
 * Opens a browser-based modal dialog for user input.
 * Prints the result as JSON to stdout.
 * 
 * Usage:
 *   node dialog-cli.js --title "Pick a stack" --options "React,Vue,Svelte"
 *   node dialog-cli.js --title "Enter description" --type text_input
 *   node dialog-cli.js --title "Select features" --options "Auth,DB,API" --type multi_select
 * 
 * Output (stdout):
 *   {"type":"single_select","selected":"React"}
 *   {"type":"text_input","value":"My custom text"}
 *   {"type":"multi_select","selected":["Auth","API"]}
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// ─── Parse CLI Args ───────────────────────────────────────────────────────────

function parseArgs() {
    const args = process.argv.slice(2);
    const result = {
        title: 'Select an option',
        message: '',
        options: [],
        type: 'single_select',
        placeholder: '',
    };

    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--title':
            case '-t':
                result.title = args[++i] || result.title;
                break;
            case '--message':
            case '-m':
                result.message = args[++i] || '';
                break;
            case '--options':
            case '-o':
                result.options = (args[++i] || '').split(',').map(s => s.trim()).filter(Boolean);
                break;
            case '--type':
                result.type = args[++i] || 'single_select';
                break;
            case '--placeholder':
            case '-p':
                result.placeholder = args[++i] || '';
                break;
        }
    }

    return result;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
    const dialogData = parseArgs();

    // Read dialog HTML template
    const htmlPath = path.join(__dirname, 'dialog.html');
    let html = fs.readFileSync(htmlPath, 'utf8');

    const dialogId = 'dialog-' + Date.now();
    html = html.replace('/*DIALOG_DATA*/', JSON.stringify(dialogData));
    html = html.replace('DIALOG_ID_PLACEHOLDER', dialogId);

    // Start local HTTP server
    const server = http.createServer((req, res) => {
        const url = new URL(req.url, 'http://localhost');

        if (url.pathname === '/' || url.pathname === '/dialog') {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(html);
        } else if (url.pathname === '/submit' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
                try {
                    const { result } = JSON.parse(body);
                    // Print result to stdout
                    console.log(JSON.stringify(result));
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end('{"ok":true}');
                    // Close server after response
                    setTimeout(() => {
                        server.close();
                        process.exit(0);
                    }, 500);
                } catch (e) {
                    res.writeHead(400);
                    res.end('Bad request');
                }
            });
        } else {
            res.writeHead(404);
            res.end('Not found');
        }
    });

    server.listen(0, '127.0.0.1', () => {
        const port = server.address().port;
        const url = `http://127.0.0.1:${port}/dialog`;

        // Open browser
        const platform = process.platform;
        if (platform === 'win32') {
            exec(`start "" "${url}"`);
        } else if (platform === 'darwin') {
            exec(`open "${url}"`);
        } else {
            exec(`xdg-open "${url}"`);
        }

        // Stderr info (won't pollute stdout JSON result)
        process.stderr.write(`Dialog opened at ${url}\n`);
    });

    // Timeout after 5 minutes
    setTimeout(() => {
        console.log(JSON.stringify({ cancelled: true, selected: null }));
        server.close();
        process.exit(0);
    }, 300000);
}

main().catch((err) => {
    process.stderr.write(`Error: ${err.message}\n`);
    console.log(JSON.stringify({ error: err.message, cancelled: true }));
    process.exit(1);
});
