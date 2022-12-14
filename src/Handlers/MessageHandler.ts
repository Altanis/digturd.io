import { CloseEvent, Characters, Movement } from '../Const/Enums';

import PlayerHandler from './PlayerHandler';
import GameServer from '../GameServer';
import Vector from './Vector';
import { randInt } from '../Utils/Functions';
import { Sword } from '../Const/Game/Weapons';

export default class MessageHandler {
    /** The manager of the WebSocket Server. */
    public server: GameServer;
    
    constructor(server: GameServer) {
        this.server = server;
    }

    // [0, string(name), i8(characterIdx), i8(abilityIdx)]
    Spawn(player: PlayerHandler): void {
        const name = player.SwiftStream.ReadUTF8String()?.trim();
        const characterIndex = player.SwiftStream.ReadI8();
        const abilityIndex = player.SwiftStream.ReadI8();

        console.log(name, characterIndex, abilityIndex);

        if (
            !name
            || name.length <= 0
            || name.length >= 16
            || player.alive

            || !Characters[characterIndex]
            || !Characters[characterIndex].abilities[abilityIndex]
        ) return player.close(CloseEvent.InvalidProtocol);

        player.name = name;
        player.character = Characters[characterIndex];
        player.abilityIndex = abilityIndex;
        player.weapon = Sword;

        player.velocity = new Vector(0, 0);
        player.position = new Vector(randInt(0, this.server.arenaBounds), randInt(0, this.server.arenaBounds));

        player.alive = true;
        player.update.add("position");
    }

    // [1, i8(Movement)]
    Move(player: PlayerHandler): void {
        if (
            !player.alive
            || !player.velocity
        ) return player.close(CloseEvent.InvalidProtocol);
        
        const movementKeys = [];
        while (player.SwiftStream.at < player.SwiftStream.buffer.length)
            movementKeys.push(player.SwiftStream.ReadI8());
                
        // TODO(Altanis): Make this versatile. Remember, the force is with you!
        // Formulas: F = ma, a = dv/dt, v = dx/dt
        for (const movement of movementKeys) {
            switch (movement) {
                case Movement.Up: player.velocity!.y = -player.character!.speed; break;
                case Movement.Right: player.velocity!.x = player.character!.speed; break;
                case Movement.Down: player.velocity!.y = player.character!.speed; break;
                case Movement.Left: player.velocity!.x = -player.character!.speed; break;
                default: return player.close(CloseEvent.InvalidProtocol);
            }
        }

        player.update.add("position");
    }

    // [2, i8(angle)]
    Angle(player: PlayerHandler): void {
        const angle = player.SwiftStream.ReadFloat32(); // measured in radians
        if (
            !player.alive
            || isNaN(angle)
            || angle > 3.15
            || angle < -3.15
        ) return player.close(CloseEvent.InvalidProtocol);

        player.angle = (angle < 0 && angle >= -3.15) ? angle + Math.PI * 2 : angle;
    }

    // [3]
    Attack(player: PlayerHandler): void {
        if (!player.alive || !player.weapon) return player.close(CloseEvent.InvalidProtocol);
        const isAtk = player.SwiftStream.ReadI8() === 0x01;

        player.attacking = isAtk;
        player.update.add("attacking");
    }
 };