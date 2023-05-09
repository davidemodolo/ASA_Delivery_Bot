import { default as config_multi } from "./config_multi.js";
import { DeliverooApi, timer } from "@unitn-asa/deliveroo-js-client";

// CHANGE THIS TO TEST
const extended = false;
const verbose = false;
const sizeX = 20;
const sizeY = 20;
const agents_num = 3;
// const clients = [
//     new DeliverooApi(config_multi.host1, config_multi.token1),
//     new DeliverooApi(config_multi.host2, config_multi.token2),
//     new DeliverooApi(config_multi.host3, config_multi.token3),
//     new DeliverooApi(config_multi.host4, config_multi.token4)
// ];

// divide a circle in n equal slices like pizza adapted to a matrix
function divideMatrix(matrix, n, extended = false, verbose = false) {
  const numRows = matrix.length;
  const numCols = matrix[0].length;
  const numSlices = n;
  const angle = (2 * Math.PI) / numSlices;
  const center = [Math.floor(numRows / 2), Math.floor(numCols / 2)];
  const slices = [];

  // create the pairs of coordinates for each slice
  for (let i = 0; i < numSlices; i++) {
    const slice = [];
    //slice.push(center);
    for (let row = 0; row < numRows; row++) {
      for (let col = 0; col < numCols; col++) {
        const x = col - center[1];
        const y = center[0] - row;
        var currentAngle = Math.atan2(y, x);
        if (currentAngle < 0) {
          currentAngle += 2 * Math.PI;
        }
        const sliceStartAngle = angle * i;
        const sliceEndAngle = angle * (i + 1);
        if (currentAngle >= sliceStartAngle && currentAngle < sliceEndAngle) {
          slice.push([row, col]);
        }
      }
    }
    slices.push(slice);
  }

  for (let i = 0; i < slices.length; i++) {
    for (let j = 0; j < slices[i].length; j++) {
      matrix[slices[i][j][0]][slices[i][j][1]] = i;
    }
  }
  if(verbose) console.table(matrix);
  const mapData2 = matrix.map((arr) => arr.slice());

  for (let i = 0; i < matrix.length; i++) {
    for (let j = 0; j < matrix[i].length; j++) {
      var neighbors = getNeighbors(matrix, i, j, extended);
      var neighborsSet = new Set(neighbors);
      var count = 0;
      for (let k = 0; k < neighbors.length; k++) {
        if (neighbors[k] == matrix[i][j]) count++;
      }
      if (count <= 3) {
        mapData2[i][j] = [...Array.from(neighborsSet)];
      } else mapData2[i][j] = [matrix[i][j]];
    }
  }
  if (verbose) console.table(mapData2);

  const slices_final = [];
  for (let i = 0; i < n; i++) {
    slices_final.push([]);
  }
  for (let i = 0; i < mapData2.length; i++) {
    for (let j = 0; j < mapData2[i].length; j++) {
      for (let k = 0; k < mapData2[i][j].length; k++) {
        slices_final[mapData2[i][j][k]].push([i, j]);
      }
    }
  }

  return slices_final;
}

function getNeighbors(matrix, row, col, extended = false) {
  const numRows = matrix.length;
  const numCols = matrix[0].length;
  var neighbors = [];
  if (row - 1 >= 0) {
    neighbors.push(matrix[row - 1][col]);
  }
  if (row + 1 < numRows) {
    neighbors.push(matrix[row + 1][col]);
  }
  if (col - 1 >= 0) {
    neighbors.push(matrix[row][col - 1]);
  }
  if (col + 1 < numCols) {
    neighbors.push(matrix[row][col + 1]);
  }

  if (extended) return neighbors;

  if (row - 1 >= 0 && col + 1 < numCols) {
    neighbors.push(matrix[row - 1][col + 1]);
  }
  if (row - 1 >= 0 && col - 1 >= 0) {
    neighbors.push(matrix[row - 1][col - 1]);
  }
  if (row + 1 < numRows && col + 1 < numCols) {
    neighbors.push(matrix[row + 1][col + 1]);
  }
  if (row + 1 < numRows && col - 1 >= 0) {
    neighbors.push(matrix[row + 1][col - 1]);
  }
  return neighbors;
}

// divide the matrix in n parts

const mapData = new Array(sizeX).fill(99).map(() => new Array(sizeY).fill(99));
const slices_res = divideMatrix(mapData, agents_num, extended, verbose);
  
//console.log(slices_res);


  // print the matrix
  //console.log("Final matrix with " + i + " agents:");
  //console.table(mapData);

// /* CREATE MAP DATA */
// var maxX = 0;
// var maxY = 0;
// var mapData;

// clients[0].onMap((width, height, tiles) => {
//     maxX = width;
//     maxY = height;

//     mapData = new Array(maxX).fill(0).map(() => new Array(maxY).fill(0));

//     tiles.forEach((tile) => {
//         mapData[tile.x][tile.y] = tile.delivery ? 2 : 1;
//     });

//     //console.log(mapData);
// });

// /* DIVIDE USING divideMatrix WITH clients.length */

// const slices_res = divideMatrix(mapData, clients.length);

// /* CREATE AN AGENT LOOP THAT MAKES THE AGENT WALK LONG THE BORDER*/

// function agentLoop() {
//     clients.forEach((client, index) => {
//         goalPoint = slices_res[index][0];
//         moves = ["up", "down", "left", "right"];
//         // get agent current position
//         var x, y;
//         client.onYou((agent) => {
//             x = agent.x;
//             y = agent.y;
//         });
//         // select the best move for the agent to reach the goal point
//         var bestMove = moves[0];
//         var bestDistance = Math.abs(x - goalPoint[0]) + Math.abs(y - goalPoint[1]);
//         moves.forEach((move) => {
//             var distance = 0;
//             if (move == "up") {
//                 distance = Math.abs(x - 1 - goalPoint[0]) + Math.abs(y - goalPoint[1]);
//             } else if (move == "down") {
//                 distance = Math.abs(x + 1 - goalPoint[0]) + Math.abs(y - goalPoint[1]);
//             } else if (move == "left") {
//                 distance = Math.abs(x - goalPoint[0]) + Math.abs(y - 1 - goalPoint[1]);
//             } else if (move == "right") {
//                 distance = Math.abs(x - goalPoint[0]) + Math.abs(y + 1 - goalPoint[1]);
//             }
//             if (distance < bestDistance) {
//                 bestDistance = distance;
//                 bestMove = move;
//             }
//         });
//         // move the agent
//         client.move(bestMove);
//     });
// }

// /* GIVE EACH AGENT ITS SLICE OF MAP */

// /* ENJOY */

// timer(agentLoop, 100);
