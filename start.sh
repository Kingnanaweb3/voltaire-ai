#!/bin/bash
cd /app
npx ts-node-dev api/index.ts &
sleep 5
npx ts-node agents/rebalancer/index.ts
