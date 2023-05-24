//try to implement control loop
import { DeliverooApi } from "@unitn-asa/deliveroo-js-client";

const client = new DeliverooApi('http://localhost:8080/?name=Cannarsi',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjA5ZDBiMDA0NDdlIiwibmFtZSI6IkNhbm5hcnNpIiwiaWF0IjoxNjgyMDk4NTI0fQ.juYE2bZS6jm8ghTqrpfheFSVSjpIz_C1s-bPIj4LN1w')

let cols = 0;
let rows = 0;
let maxX = 0;
let maxY = 0;
var mapData;
const delivery_points = [];

//BELIEFS
//As beliefs I have the position of the parcels and the position of the agents and the map
client.onMap((width, height, tiles) => {
    maxX = width;
    maxY = height;

    mapData = new Array(maxX).fill(0).map(() => new Array(maxY).fill(0));

    tiles.forEach((tile) => {
        mapData[tile.x][tile.y] = tile.delivery ? 2 : 1;
        if (tile.delivery) {
            delivery_points.push([tile.x, tile.y]);
        }
    });
});
setTimeout(() => { }, 1000);

const me = {};
client.onYou(({ id, name, x, y, score }) => {
    me.id = id
    me.name = name
    me.x = x
    me.y = y
    me.score = score
})
//Can create a map of my parcels so I know what I'm carrying
const parcels = new Map();
client.onParcelsSensing(async (perceived_parcels) => {
    for (const p of perceived_parcels) {
        parcels.set(p.id, p)
    }
})

class GridPoint {
    constructor(x, y) {
        this.x = x; //x location of the grid point
        this.y = y; //y location of the grid point
        this.f = 0; //total cost function
        this.g = 0; //cost function from start to the current grid point
        this.h = 0; //heuristic estimated cost function from current grid point to the goal
        this.neighbors = []; // neighbors of the current grid point
        this.neighborsMovement = []; // movement to get to the neighbors of the current grid point
        this.parent = undefined; // immediate source of the current grid point
        this.movement = undefined; // movement to get to the current grid point

        // update neighbors array for a given grid point
        this.updateNeighbors = function (grid) {
            let i = this.x;
            let j = this.y;
            if (i < cols - 1 && mapData[i + 1][j] != 0) {
                this.neighbors.push(grid[i + 1][j]);
                this.neighborsMovement.push("right");
            }
            if (i > 0 && mapData[i - 1][j] != 0) {
                this.neighbors.push(grid[i - 1][j]);
                this.neighborsMovement.push("left");
            }
            if (j < rows - 1 && mapData[i][j + 1] != 0) {
                this.neighbors.push(grid[i][j + 1]);
                this.neighborsMovement.push("up");
            }
            if (j > 0 && mapData[i][j - 1] != 0) {
                this.neighbors.push(grid[i][j - 1]);
                this.neighborsMovement.push("down");
            }
        };
    }
}

function manhattanHeuristic(position0, position1) {
    let d1 = Math.abs(position1.x - position0.x);
    let d2 = Math.abs(position1.y - position0.y);

    return d1 + d2;
}

function init(currentX, currentY, targetX, targetY, grid, openSet, start, end) {
    //making a 2D array
    for (let i = 0; i < cols; i++) {
        grid[i] = new Array(rows);
    }

    for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
            grid[i][j] = new GridPoint(i, j);
        }
    }

    for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
            grid[i][j].updateNeighbors(grid);
        }
    }

    start = grid[currentX][currentY];
    end = grid[targetX][targetY];

    openSet.push(start);

    return [start, end];
}

function search(currentX, currentY, targetX, targetY) {
    const path = [];
    const movemements = [];
    let openSet = []; //array containing unevaluated grid points
    let closedSet = []; //array containing completely evaluated grid points
    let grid = new Array(maxX);
    cols = maxX;
    rows = maxY;
    let start;
    let end;

    [start, end] = init(
        currentX,
        currentY,
        targetX,
        targetY,
        grid,
        openSet,
        start,
        end
    );

    while (openSet.length > 0) {
        //assumption lowest index is the first one to begin with
        let lowestIndex = 0;
        for (let i = 0; i < openSet.length; i++) {
            if (openSet[i].f < openSet[lowestIndex].f) {
                lowestIndex = i;
            }
        }
        let current = openSet[lowestIndex];

        if (current === end) {
            let temp = current;
            path.push(temp);
            movemements.push(temp.movement);
            while (temp.parent) {
                path.push(temp.parent);
                movemements.push(temp.parent.movement);
                temp = temp.parent;
            }

            movemements.pop();
            return movemements.reverse();
        }

        //remove current from openSet
        openSet.splice(lowestIndex, 1);
        //add current to closedSet
        closedSet.push(current);

        let neighbors = current.neighbors;
        let neighborsMovement = current.neighborsMovement;

        for (let i = 0; i < neighbors.length; i++) {
            let neighbor = neighbors[i];
            let movement = neighborsMovement[i];

            if (!closedSet.includes(neighbor)) {
                let possibleG = current.g + 1;

                if (!openSet.includes(neighbor)) {
                    openSet.push(neighbor);
                } else if (possibleG >= neighbor.g) {
                    continue;
                }

                neighbor.g = possibleG;
                neighbor.h = manhattanHeuristic(neighbor, end);
                neighbor.f = neighbor.g + neighbor.h;
                neighbor.parent = current;
                neighbor.movement = movement;
            }
        }
    }

    //no solution by default
    return [];
}


//Intentions
//Possible intentions are: go_pick_up, go_to, go_deliver

function findDeliveryPoint(my_x, my_y) {
    let closestDeliveryPoint = { x: 0, y: 0 };
    let closestDistance = 1000000
    delivery_points.forEach((point) => {
        const dist = Math.abs(Math.round(my_x) - Math.round(point[0])) + Math.abs(Math.round(my_y) - Math.round(point[1]));
        if (dist < closestDistance) {
            closestDistance = dist;
            closestDeliveryPoint = { x: point[0], y: point[1] };
        }
    });
    return closestDeliveryPoint;
}

//List possible options
function checkOptions() {
    const options = []
    for (const parcel of parcels.values()) {
        if (!parcel.carriedBy) {
            let pickup = { x: parcel.x, y: parcel.y };
            options.push({ desire: 'go_pick_up', args: [pickup] });
        } else if (parcel.carriedBy == me.id) {
            let delivery = findDeliveryPoint(me.x, me.y);
            options.push({ desire: 'go_put_down', args: [delivery] });
        }
    }
    revisor.queue(options);
}
client.onParcelsSensing(checkOptions);


function averageScore({ x: targetX, y: targetY }, action) {
    var actualScore = 0;
    var parcelsToDeliver = 0;
    var parcelValue = 0;
    var distance = Math.abs(Math.round(targetX) - Math.round(me.x)) + Math.abs(Math.round(targetY) - Math.round(me.y));

    for (const parcel of parcels.values()) {
        if (parcel.carriedBy == me.id) {
            actualScore += parcel.reward;
            parcelsToDeliver++;
        }
        if (parcel.x == targetX && parcel.y == targetY) {
            parcelValue = parcel.reward;
        }
    }

    if (action == 'go_pick_up') {
        //The possible score is the actual score of the parcels that I'm carrying - the distance from me to the parcel I want to pickup * the number of parcels that I'm carrying
        //This is to calculate the average score that I can have once i reach the target parcel
        //Plus the value of the target parcel - the distance to calculate the value of the parcel once I reach it
        return (actualScore + parcelValue) - ((parcelsToDeliver + 1) * distance);
    }
    if (action == 'go_put_down') {
        if (parcelsToDeliver == 0) {
            return MIN_VALUE;
        }
        //The possible score is the actual score of the parcels that I'm carrying - the distance from me to the closest delivery point * the number of parcels that I'm carrying
        //This is to calculate the average score that I can have once i reach the delivery point
        return actualScore - (parcelsToDeliver * distance);
    }
}

//Intention revision to find the best action
class Revisor {

    //Will be used to stop plans if a new intention is added with higher score
    //currentIntention;
    //nextIntention;
    //noStarted = true;
    //currentScore;

    //Among all options choose the one with the highest possible reward and executes it
    async queue(options) {
        let bestOption;
        let bestScore = Number.MIN_VALUE;

        for (const option of options) {
            let currentIntention = option.desire
            let currentScore = averageScore(option.args[0], currentIntention)
            if (currentScore > bestScore) {
                bestOption = option
                bestScore = currentScore
            }
        }

        let currentIntention = new Intention(bestOption.desire, ...bestOption.args);

        await currentIntention.achieve();
        await new Promise(res => setImmediate(res));
    }
}
const revisor = new Revisor();

//Intention
class Intention extends Promise {

    #current_plan;
    stop() {
        console.log('stop intention and current plan');
        this.#current_plan.stop();
    }

    #desire;
    #args;

    #resolve;
    #reject;

    constructor(desire, ...args) {
        var resolve, reject;
        super(async (res, rej) => {
            resolve = res; reject = rej;
        })
        this.#resolve = resolve
        this.#reject = reject
        this.#desire = desire;
        this.#args = args;
    }

    #started = false;
    async achieve() {
        if (this.#started)
            return this;
        else
            this.#started = true;

        for (const plan of plans) {
            if (plan.isApplicableTo(this.#desire)) {
                this.#current_plan = plan;
                console.log('achieving desire', this.#desire, ...this.#args, 'with plan', plan);
                try {
                    const plan_res = await plan.execute(...this.#args);
                    this.#resolve(plan_res);
                    console.log('plan', plan, 'succesfully achieved intention', this.#desire, ...this.#args, 'with result', plan_res);
                    checkOptions();
                    return plan_res
                } catch (error) {
                    console.log('plan', plan, 'failed while trying to achieve intention', this.#desire, ...this.#args, 'with error', error);
                }
            }
        }

        this.#reject();
        console.log('no plan satisfied the desire ', this.#desire, ...this.#args);
        throw 'no plan satisfied the desire ' + this.#desire;
    }

}

//Plans
const plans = [];

class Plan {

    stop() {
        console.log('stop plan and all sub intentions');
        for (const i of this.#sub_intentions) {
            i.stop();
        }
    }

    #sub_intentions = [];

    async subIntention(desire, ...args) {
        const sub_intention = new Intention(desire, ...args);
        this.#sub_intentions.push(sub_intention);
        return await sub_intention.achieve();
    }

}

class GoPickUp extends Plan {

    isApplicableTo(desire) {
        return desire == 'go_pick_up';
    }

    async execute({ x, y }) {
        await this.subIntention('go_to', { x, y });
        await client.pickup()
    }
}

class GoPutDown extends Plan {

    isApplicableTo(desire) {
        return desire == 'go_put_down';
    }

    async execute({ x, y }) {
        await this.subIntention('go_to', { x, y });
        await client.putdown()
    }
}


async function moveToTarget(movs) {
    var movemementsDone = [movs.length];

    movemementsDone[0] = await client.move(movs[0]);
    for (var i = 1; i < movs.length; i++) {
        if (movemementsDone[i - 1]) {
            movemementsDone[i] = await client.move(movs[i]);
        }
    }
}


class Reach extends Plan {

    isApplicableTo(desire) {
        return desire == 'go_to';
    }

    async execute({ x, y }) {
        await moveToTarget(search(me.x, me.y, x, y));
    }
}

plans.push(new GoPutDown())
plans.push(new GoPickUp())
plans.push(new Reach())