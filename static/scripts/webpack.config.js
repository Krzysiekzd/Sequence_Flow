// Generated using webpack-cli https://github.com/webpack/webpack-cli

const path = require('path');

const isProduction = process.env.NODE_ENV == 'production';


const stylesHandler = 'style-loader';



const config = {
	entry: {
		index: './src/index.js',
		bar: './src/resizableBar.js'
	},
	output: {
		path: path.resolve(__dirname, 'dist'),
		filename: '[name].js'
	},
	module: {
		rules: [
			{
				test: /\.js$/,
				include: path.resolve(__dirname, 'src'),
				loader: 'babel-loader',
			},
		],
	},
	resolve: {
		extensions: ['.ts', '.js'],
	}
};

module.exports = () => {
	if (isProduction) {
		config.mode = 'production';
        
        
	} else {
		config.mode = 'development';
	}
	return config;
};
