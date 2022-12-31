const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

function resize() {
    canvas.width = window.innerWidth * window.devicePixelRatio;
    canvas.height = window.innerHeight * window.devicePixelRatio;
}

window.addEventListener("resize", resize);
resize();

Math.TAU = Math.PI * 2;
Math.randomRange = (min, max) => Math.random() * (max - min) + min;

const Config = {
    WebSocket: {
        CloseEvents: {
            3000: "The server has detected multiple connections by you. Please terminate any existing connections.",
            3001: "The server is full.",
            3002: "The server has detected a malformed request made by you. Please refresh.",
            3003: "The server has detected that you are a banned player.",
            3006: "An unknown error has occurred. Please refresh."
        }
    },
    HomeScreen: {
        /** The amount of stars to be drawn. */
        starCount: 100,
        /** The holder for every star. */
        stars: [],
        /** The increment for all of the stars */
        increment: 0.1,
    },
    Gamemodes: {
        List: ["FFA"],
        Pointer: 0,
    },
    Characters: {
        List: ["Knight", "Priest", "Assassin"],
        _cp: 0,
        AbilityPointer: 0
    },
    Audio: {
        List: ["ffa"],
        Pointer: 0,
    }
};

const Data = {
    Knight: {
        Abilities: [
            {
                name: "Dual Wield",
                description: "Attack with double the power.",
                src: "assets/img/abilities/dual_wield.png"
            },
            {
                name: "Charge",
                description: "Bash into a foe with your shield.",
                src: "assets/img/abilities/charge.png"
            }
        ]
    },
    Priest: {
        Abilities: [
            {
                name: "Castor",
                description: "Attack with double the power.",
                src: "assets/img/abilities/dual_wield.png"
            },
        ]
    },
    Assassin: {
        Abilities: [
            {
                name: "Dual Wield",
                description: "Attack with double the power.",
                src: "assets/img/abilities/dual_wield.png"
            },
            {
                name: "Charge",
                description: "Bash into a foe with your shield.",
                src: "assets/img/abilities/charge.png"
            }
        ]
    }
};

        /**
         * This section manages the character selection.
         */
        /*characterName.innerText = Config.Characters.List[Config.Characters.CharacterPointer];
        const src = `assets/img/characters/${characterName.innerText}.gif`;
        if (!characterSprite.src.includes(src)) characterSprite.src = src;

        /**
         * This section manages the ability.
         
        abilities[Config.Abilities.Pointer].classList.add("selected");
        abilityDesc.innerText = Config.Abilities.List[Config.Abilities.Pointer];*/

/** Observe mutations. */
Object.defineProperties(Config.Characters, {
    CharacterPointer: {
        get() { return this._cp },
        set(value) {
            console.log(value);
            characterName.innerText = Config.Characters.List[value];
            const src = `assets/img/characters/${characterName.innerText}.gif`;
            characterSprite.src = src;

            // TODO(Altanis): Change abilities based on character.
            const characterAbilities = Data[characterName.innerText].Abilities;
            abilities.innerHTML = "";
            for (const ability of characterAbilities) {
                const abilityElement = document.createElement("img");
                abilityElement.width = abilityElement.height = 50;
                abilityElement.src = ability.src;
                abilityElement.classList.add("character-ability");
                abilityElement.addEventListener("click", () => {
                    const index = characterAbilities.indexOf(ability);
                    Config.Characters.AbilityPointer = index;
                });
                abilities.appendChild(abilityElement);
            }

            Config.Characters.AbilityPointer = 0;
            abilityName.innerText = characterAbilities[Config.Characters.AbilityPointer].name;
            abilityDesc.innerText = characterAbilities[Config.Characters.AbilityPointer].description;

            this._cp = value;
        },
    },
    AbilityPointer: {
        get() { return this._ap },
        set(value) {
            abilities.children[Config.Characters.AbilityPointer]?.classList.remove("selected");
            abilities.children[value]?.classList.add("selected");
            abilityName.innerText = Data[characterName.innerText].Abilities[value].name;
            abilityDesc.innerText = Data[characterName.innerText].Abilities[value].description;

            this._ap = value;
        }
    }
});

/** DOM ELEMENTS */

/** Home screen elements */
const Gamemodes = document.getElementById("gamemodes");

const connecting = document.getElementById("connecting"),
    characterName = document.getElementById("character-name"),
    characterSprite = document.getElementById("character-sprite");

const arrowLeft = document.getElementById("arrow-left"),
    arrowRight = document.getElementById("arrow-right");

const abilityName = document.getElementById("ability-name"),
    abilityDesc = document.getElementById("ability-desc"),
    abilities = document.getElementById("ability");

const Storage = {
    get(key) {
        return localStorage.getItem(key);
    },
    set(key, value) {
        localStorage.setItem(key, value);
    },
    remove(key) {
        localStorage.removeItem(key);
    },
    has(key) {
        return localStorage.hasOwnProperty(key);
    }
}

const AudioManager = class {
    constructor() {
        this.audio = new Audio();
    }

    play(name) {
        this.audio.src = `assets/audio/${name}.mp3`;
        this.audio.play();
    }
};

const WebSocketManager = class {
    constructor(url) {
        this.url = url; // The URL to connect to.
        this.socket = new WebSocket(url); // The WebSocket connection.
        this.migrations = 0; // The amount of migrations to a new server. Resets when a connection is successfully established.

        this.handle();
    }

    migrate(url) {
        if (++this.migrations > 3) return console.log("Failed to reconnect to the server. Please refresh.");

        this.url = url;
        this.socket.close(4999, "Migrating to a new server.");
        this.socket = new WebSocket(url);
        this.handle();
    }

    handle() {
        this.socket.addEventListener("open", () => {
            console.log("Connected to server!");
            this.migrations = 0;
        });
        
        this.socket.addEventListener("close", event => {
            if (event.code === 4999) return; // Migrating to a new server.

            if ([3001, 3003, 3006].includes(event.code)) return this.migrate(this.url);
            console.log(Config.WebSocket.CloseEvents[event.code] || "An unknown error has occurred. Please refresh.");
        });
        
        this.socket.addEventListener("error", event => {
            console.log("An error has occured during the connection:", event);
        });
    }
}

let io;
let audio = new AudioManager();

const Game = {
    RenderCircle(x, y, radius) {
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.TAU);
        ctx.fill();
    },

    Setup() {
        /**
         * Sets up the game. Ran once before the requestAnimationFrame loop.
         */

        /** Sets up the character modal. */
        Config.Characters.CharacterPointer = 0;

        /** Sets up the WebSocket Manager. */
        io = new WebSocketManager("ws://localhost:8080");

        /** Adds a listener to each gamemode, selects them when clicked. 
         * TODO(Altanis|Feature): Connect to a new WebSocket when a gamemode is selected.
         */
        for (let i = Gamemodes.children.length; i--;) {
            const child = Gamemodes.children[i];
            if (child.classList.contains("disabled")) continue;

            child.addEventListener("click", function () {
                Config.Gamemodes.Pointer = i;
                for (const sibling of this.parentElement.children) sibling.classList.remove("selected");
            });
        }

        /** Adds a listener to each arrow, incrementing/decrementing the pointer to each character. */
        arrowLeft.addEventListener("click", function () {
            Config.Characters.CharacterPointer = ((Config.Characters.CharacterPointer - 1) + Config.Characters.List.length) % Config.Characters.List.length;
        });

        arrowRight.addEventListener("click", function () {
            console.log(Config.Characters.CharacterPointer);
            Config.Characters.CharacterPointer = (Config.Characters.CharacterPointer + 1) % Config.Characters.List.length;
        });
    },

    HomeScreen() {
        /**
         * This section draws the home screen animation. It resembles space while moving quick in it.
         * To make the effect that space is moving, we need to:
            * 1. Draw a black background
            * 2. Draw big stars with varying radii
            * 3. Increase their radii by small amounts to simulate moving close to them
            * 4. Generate new stars when the old ones become big
         */

        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = "#FFFFFF";
        if (Config.HomeScreen.stars.length !== Config.HomeScreen.starCount) {
            for (let i = Config.HomeScreen.starCount - Config.HomeScreen.stars.length; --i;) {
                
                Config.HomeScreen.stars.push({
                    x: Math.randomRange(0, canvas.width),
                    y: Math.randomRange(0, canvas.height),
                    radius: Math.randomRange(0.1, 1.5)
                });
            }
        }

        for (let i = Config.HomeScreen.stars.length; i--;) {
            const star = Config.HomeScreen.stars[i];
            ctx.fillStyle = "#fff";
            Game.RenderCircle(star.x, star.y, star.radius);
            star.radius += Config.HomeScreen.increment;
            if (star.radius >= 3) {
                Config.HomeScreen.stars.splice(i, 1);
            }
        }

        /** 
         * This section manages gamemodes and how they're displayed.
         */
        Gamemodes.children[Config.Gamemodes.Pointer].classList.add("selected");

        /**
         * This section manages the character selection.
         */


        /**
         * This section manages the ability.
         */
        /*abilities[Config.Abilities.Pointer].classList.add("selected");
        abilityDesc.innerText = Config.Abilities.List[Config.Abilities.Pointer];*/
    }
}

Game.Setup();

function UpdateGame() {
    Game.HomeScreen();
    requestAnimationFrame(UpdateGame);
}

UpdateGame();