[![Build Status](https://github.com/pedrokehl/caminho/workflows/Build/badge.svg)](https://github.com/pedrokehl/caminho/actions)
[![Build Status](https://github.com/pedrokehl/caminho/workflows/Lint/badge.svg)](https://github.com/pedrokehl/caminho/actions)
[![Build Status](https://github.com/pedrokehl/caminho/workflows/Test/badge.svg)](https://github.com/pedrokehl/caminho/actions)

# Caminho

## Features

Features:
[X] Concurrency
[X] Batching
[X] Execution stats for each step
[X] Backpressure
[ ] Aggregation
[ ] Type Checking
[ ] Parallel execution (multiple steps at the same time)
[ ] Dynamic/smart backpressure - see: https://itnext.io/lossless-backpressure-in-rxjs-b6de30a1b6d4
[ ] Subflow - See forkJoin operator, can be helpful
[ ] Error handling - See catchError operator, and https://blog.angular-university.io/rxjs-error-handling/

## Contributing
- Clone the repository
```
git clone https://github.com/pedrokehl/caminho
```
- Install dependencies
```
cd caminho
npm install
```
- Use unit-tests as your guide
```
npm test
or
npm watch-test
```
