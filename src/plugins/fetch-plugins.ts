import * as esbuild from "esbuild-wasm";
import axios from "axios";
import localforage from "localforage";

const filecache = localforage.createInstance({
  name: "filecache",
});

export const fetchPlugin = (inputCode: string) => {
  return {
    name: "fetch-plugin",
    setup(build: esbuild.PluginBuild) {
      build.onLoad({ filter: /(^index\.js$)/ }, () => {
        return {
          loader: "jsx",
          contents: inputCode,
        };
      });

      build.onLoad({ filter: /.*/ }, async (args: any) => {
        console.log("I ran but didnt do a thing");

        // check to see if we have already fetched the file
        // and if it is in the cache
        const cachedResult = await filecache.getItem<esbuild.OnLoadResult>(
          args.path
        );

        // if it is, return it immediately
        if (cachedResult) {
          return cachedResult;
        }
      });

      build.onLoad({ filter: /.css$/ }, async (args: any) => {
        // if (args.path === "index.js") {
        //   return {
        //     loader: "jsx",
        //     contents: inputCode,
        //   };
        // }

        const { data, request } = await axios.get(args.path);

        const escaped = data
          .replace(/\n/g, "")
          .replace(/"g/, '\\"')
          .replace(/'/g, "\\'");
        const contents = `const style = document.createElement('style);
           style.innerText = '${escaped}';
           document.head.appendChild(style);
          `;

        const result: esbuild.OnLoadResult = {
          loader: "jsx",
          contents,
          resolveDir: new URL("./", request.responseURL).pathname,
        };

        // store response in cache
        await filecache.setItem(args.path, result);

        return result;
      });

      build.onLoad({ filter: /.*/ }, async (args: any) => {
        console.log("onLoad", args);
        // if (args.path === "index.js") {
        //   return {
        //     loader: "jsx",
        //     contents: inputCode,
        //   };
        // }

        const { data, request } = await axios.get(args.path);

        const result: esbuild.OnLoadResult = {
          loader: "jsx",
          contents: data,
          resolveDir: new URL("./", request.responseURL).pathname,
        };

        // store response in cache
        await filecache.setItem(args.path, result);

        return result;
      });
    },
  };
};
