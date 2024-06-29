import { describe, test } from 'vitest';

describe('StaticFile tests', () => {
    test.todo('Constructor sets filepath property');
    test.todo('name returns StaticFile');
    test.todo('view returns readable stream of file if call to fs.createReadStream() succeeds');
    test.todo('view throws error if call to fs.createReadStream() fails');
    test.todo('filename returns filepath.relative');
    test.todo('plugincolour returns none');
    test.todo('fromFile() returns object with correct filepath property');
});

describe('defaultPluginDef tests', () => {
    test.todo('name property is StaticFile');
    test.todo('group property is files');
    test.todo('pattern property is empty');
    test.todo('class property is StaticFile constructor');
});
