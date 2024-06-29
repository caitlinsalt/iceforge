import { describe, test } from 'vitest';

describe('renderView() tests', () => {
    test.todo('If content.view is a function, renderView() calls content.view()');
    test.todo('If content.view is a function, the correct parameters are passed to it');
    test.todo('If content.view is a function, renderView() returns the return value of content.view()');
    test.todo('If content.view is a string, renderView() looks it up in the view map and calls the returned function');
    test.todo('If content.view is a string, the correct parameters are passed to the view function');
    test.todo('If content.view is a string, renderView() returns the value returned by the view function');
    test.todo('If content.view is a string that is not in the view map, renderView() throws an error');
});

describe('render() tests', () => {
    test.todo('Calls renderView() for every item in the content tree');
    test.todo('Succeeds if the content tree is empty');
    test.todo('Succeeds if no items in the content tree return output');
    test.todo('Tries to save the result of every call to renderView() that returns data');
});
