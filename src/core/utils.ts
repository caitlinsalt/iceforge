import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { DateTime } from 'luxon';

// Remove the file extension from a path.
export const stripExtension = (filename: string): string => filename.replace(/(.+)\.[^.]+$/, '$1');

// Read a file and parse it as JSON.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const readJson = async (filename: string): Promise<any> => {
    let data = null;
    try {
        data = await fs.readFile(filename);
    } catch (error) {
        error.filename = filename;
        throw error;
    }
    try {
        return JSON.parse(data.toString());
    } catch (error) {
        error.filename = filename;
        error.message = `parsing ${path.basename(filename)}: ${error.message}`;
        throw error;
    }
};

// Check if a file exists.
export const fileExists = async (filepath: string): Promise<boolean> => {
    try {
        await fs.access(filepath, fs.constants.R_OK);
        return true;
    } catch {
        return false;
    }
};

// Recursively read the names of the items in a directory tree.
export const readDirRecursive = async (directory: string): Promise<string[]> => {
    const result: string[] = [];
    const walk = async (dir = ''): Promise<void> => {
        const dirContents = await fs.readdir(path.join(directory, dir));
        for (let i = 0; i < dirContents.length; ++i) {
            const relName = path.join(dir, dirContents[i]);
            const stat = await fs.stat(path.join(directory, relName));
            if (stat.isDirectory()) {
                await walk(relName);
            } else {
                result.push(relName);
            }
        }
    };
    await walk();
    return result;
};

// Convert a date to an RFC2822-format string 
export const rfc2822 = (date: Date): string => {
    return DateTime.fromJSDate(date).toRFC2822();
};

// Backwards-compatibility with Wintersmith.
export const rfc822 = rfc2822;

// Resolve a URL
export const urlResolve = (from: string, to: string): string => {
    const resolvedUrl = new URL(to, new URL(from, 'resolve://'));
    if (resolvedUrl.protocol === 'resolve:') {
        // `from` is a relative URL.
        const { pathname, search, hash } = resolvedUrl;
        return pathname + search + hash;
    }
    return resolvedUrl.toString();
};
