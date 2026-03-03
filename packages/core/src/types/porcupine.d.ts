/**
 * Type declarations for @picovoice/porcupine-node
 * Wake word detection library
 */

declare module "@picovoice/porcupine-node" {
  export interface PorcupineOptions {
    accessKey: string;
    keywords?: string[];
    keywordPaths?: string[];
    modelPath?: string;
    sensitivity?: number;
    sensitivities?: number[];
    endpointDurationSec?: number;
    requireEndpoint?: boolean;
  }

  export interface PorcupineDetection {
    keyword: string | null;
    label: string | null;
    isEndpoint: boolean;
    startIndex: number;
    endIndex: number;
  }

  export default class Porcupine {
    constructor(options: PorcupineOptions);
    process(frame: Int16Array): PorcupineDetection | null;
    reset(): void;
    release(): void;
    frameLength: number;
    sampleRate: number;
    version: string;
  }

  export const BuiltInKeyword: {
    ALEXA: "alexa";
    AMERICANO: "americano";
    BLUEBERRY: "blueberry";
    BUMBLEBEE: "bumblebee";
    COMPUTER: "computer";
    GRAPEFRUIT: "grapefruit";
    GRASSHOPPER: "grasshopper";
    HEY_GOOGLE: "hey google";
    HEY_SIRI: "hey siri";
    JARVIS: "jarvis";
    OK_GOOGLE: "ok google";
    PICOVOCIE: "picovoice";
    PORCUPINE: "porcupine";
    TERMINATOR: "terminator";
  };
}
