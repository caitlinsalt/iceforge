import { describe, expect, test } from 'vitest';
import { FakeEnvironment } from '../../core/fakes/fakeEnvironment';
import { MarkdownPage } from '../../../plugins/markdown';

describe('MarkdownPage integration tests', () => {
    describe('getHtml() tests', () => {

        // Issue #88 - images inside link tags are not correctly rendered.
        test('Input containing image links is rendered correctly', () => {
            const testFilepath = { full: '/www/content/file.page', relative: 'content/index.html' };
            const testMetadata = {};
            const fakeEnvironment = new FakeEnvironment();
            const testMarkdown = '[![The alt text](img-filename.jpg "image title")](linkTarget)';
            const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);
            testObject.__env = fakeEnvironment;
            
            const testOutput = testObject.getHtml('/testBase');

            expect(testOutput).toMatchSnapshot();
        });
    });
});
