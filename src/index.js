const fs = require('fs');
const path = require('path');
const babel = require('@rollup/plugin-babel').default;
const resolve = require('rollup-plugin-node-resolve');
const serve = require('rollup-plugin-serve');
const replaceDist = require('rollup-plugin-replace');
const commonjs = require('rollup-plugin-commonjs');
const json = require('rollup-plugin-json');

const supportedExtensions = ['.js', '.jsx', '.ts', '.tsx'];

function getConfig(file, settings = {}) {
    const destinationDir = path.parse(file.replace('src', 'dist')).dir;
    const destinationEs = path.parse(file.replace('src', 'es')).dir;

    return {
        treeshake: {
            propertyReadSideEffects: false,
            moduleSideEffects: 'no-external',
        },
        input: file,
        output: [
            {
                dir: destinationDir,
                format: 'cjs',
                freeze: false,
                preserveModules: true,
            },
            {
                dir: destinationEs,
                format: 'es',
                freeze: false,
                preserveModules: true,
            },
        ],
        plugins: [
            babel({
                exclude: 'node_modules/**',
                extensions: supportedExtensions,
                babelHelpers: 'runtime',
            }),
            resolve({
                modulesOnly: true,
                customResolveOptions: {
                    moduleDirectory: 'src',
                },
                extensions: supportedExtensions,
            }),
            json(),
        ],
        ...settings,
    };
}

function getDevelopConfig(file) {
    const base = getConfig(file);
    const destinationFile = file.replace(/dev/, '/build/').replace(/\.(tsx|ts)$/, '.js');

    fs.copyFileSync(path.resolve(__dirname, '..', 'assets', 'index.html'), path.resolve(path.parse(destinationFile).dir, 'index.html'));

    return {
        ...base,
        plugins: [
            replaceDist({
                'process.env.NODE_ENV': JSON.stringify('production'),
            }),
            commonjs({
                include: 'node_modules/**',
                namedExports: {
                    'node_modules/react/index.js': [
                        'Children',
                        'Component',
                        'PureComponent',
                        'PropTypes',
                        'createElement',
                        'Fragment',
                        'cloneElement',
                        'StrictMode',
                        'createFactory',
                        'createRef',
                        'createContext',
                        'isValidElement',
                        'isValidElementType',
                        'forwardRef',
                    ],
                    'node_modules/react-dom/index.js': ['render', 'hydrate'],
                },
            }),
            resolve({
                browser: true,
                extensions: supportedExtensions,
            }),
            babel({
                exclude: 'node_modules/**',
                extensions: supportedExtensions,
            }),
            serve({
                contentBase: 'build',
                port: 8080,
            }),
        ],
        output: [
            {
                file: destinationFile,
                format: 'cjs',
                freeze: false,
            },
        ],
    };
}

module.exports = {
    getConfig,
    getDevelopConfig,
};
