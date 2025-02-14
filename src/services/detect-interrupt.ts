//
// Detects when the user has interrupted the program (e.g. using ctrl-C).
//

import { InjectableSingleton } from "@codecapers/fusion";
import * as readline from "readline";
import { Plugin } from "../lib/plugin";

export const IDetectInterrupt_id = "IDetectInterrupt";

export type InterruptHandler = () => Promise<boolean>;

export interface IDetectInterrupt {

    //
    // Shutdown the interrupt handler.
    //
    close(): void;

    //
    // Pushs an interrupt handler.
    //
    pushHandler(handler: InterruptHandler): void;

    //
    // Pops the last handler that was pushed.
    //
    popHandler(): void;
}

@InjectableSingleton(IDetectInterrupt_id)
export class DetectInterrupt implements IDetectInterrupt {

    //
    // Stack of interrupt handlers.
    //
    private handlers: InterruptHandler[] = [];

    //
    // Read input line by line.
    //
    private readline?: readline.Interface;
    
    private constructor() {
        //
        // https://stackoverflow.com/a/20165643/25868
        // https://stackoverflow.com/a/14861513/25868
        //
        if (process.platform === "win32") {
            this.readline = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });
          
            this.readline.on("SIGINT", () => {
                (process.emit as any)("SIGINT");
            });
        }
          
        process.on("SIGINT", () =>  {
            this.invokeHandlers();
        });
    }

    //
    // Shutdown the interrupt handler.
    //
    close(): void {
        if (this.readline) {
            this.readline.close();
            this.readline = undefined;
        }  
    }

    //
    // Invoke interrupt handlers in the stack.
    //
    private async invokeHandlers(): Promise<void> {
        
        console.log(`Shutting down...`);

        // 
        // Work backwards from the most recently pushed handler.
        //
        try {
            for (let i = this.handlers.length-1; i >= 0; i -= 1) {
                const allow = await this.handlers[i]();
                if (!allow) {
                    // Disallow the termination.
                    return;
                }
            }

            process.exit(0); // Terminate.
        }
        catch (err) {
            console.error(`Error during shutdown:`);
            console.error(err && err.stack || err);
            process.exit(1);
        }
    }

    //
    // Pushs an interrupt handler.
    //
    pushHandler(handler: InterruptHandler): void {
        this.handlers.push(handler);        
    }

    //
    // Pops the last handler that was pushed.
    //
    popHandler(): void {
        this.handlers.pop();
    }
}