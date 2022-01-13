[![Build Status](https://github.com/pedrokehl/caminho/workflows/Build/badge.svg)](https://github.com/pedrokehl/caminho/actions)
[![Build Status](https://github.com/pedrokehl/caminho/workflows/Lint/badge.svg)](https://github.com/pedrokehl/caminho/actions)
[![Build Status](https://github.com/pedrokehl/caminho/workflows/Test/badge.svg)](https://github.com/pedrokehl/caminho/actions)

# Caminho


## Requirements
To build and run this app you just need [Node.js](https://nodejs.org/en/) installed.

Poc for the implementation using rxJS v7

Features:
[X] Concurrency
[X] Batching
[X] Execution stats for each step
[ ] Aggregation
[ ] Type Checking
[ ] Parallel execution (multiple steps at the same time)
[ ] Backpressure - See articles like https://itnext.io/lossless-backpressure-in-rxjs-b6de30a1b6d4
[ ] Subflow - See forkJoin operator, can be helpful
[ ] Error handling - See catchError operator, and https://blog.angular-university.io/rxjs-error-handling/

## Getting started
- Clone the repository
```
git clone https://github.com/pedrokehl/caminho
```
- Install dependencies
```
cd caminho
npm install
```
- Start the project
```
npm start
```
