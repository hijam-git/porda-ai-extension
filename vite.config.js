import resolve from '@rollup/plugin-node-resolve';

export default {
	build: {
		rollupOptions: {
			input: "modules/webpage/content.js",
			output: {
				format: "iife",
				name: "content",
				dir: "scripts/content",
				entryFileNames: "[name].js",
			},
		},
	},
	plugins: [
		resolve({
		  browser: true,
		  preferBuiltins: false
		})
	  ]
};
