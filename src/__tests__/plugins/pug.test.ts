import { describe, test } from 'vitest';

describe('PugTemplate tests', () => {
    test.todo('Constructor sets template property');
    test.todo('name returns pug');
    test.todo('render() calls template function');
    test.todo('render() returns buffer containing result of template function');
    test.todo('fromFile() reads filepath');
    test.todo('fromFile() passes contents of file to pug.compile()');
    test.todo('fromFile() retunns new instance with template set to return value of pug.compile()');
});

describe('Plugin registration tests', () => {
    test.todo('Plugin registration calls environment.registerTemplatePlugin() with correct arguments');
});
