import resolve from '@rollup/plugin-node-resolve';

export default {
	build: {
		rollupOptions: {
			input: "modules/offscreen/offscreen.js",
			output: {
				format: "iife",
				name: "offscreen",
				dir: "scripts/offscreen",
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
