import { InjectableClass, InjectProperty } from "@codecapers/fusion";
import { ICommand } from "../lib/command";
import { joinPath } from "../lib/join-path";
import { IDocker, IDocker_id } from "../plugins/docker";
import { IConfiguration_id, IConfiguration } from "../services/configuration";
import { IEnvironment, IEnvironment_id } from "../services/environment";
import { IFs, IFs_id } from "../services/fs";
import { Project } from "../lib/project";
import { Plugin } from "../lib/plugin";

@InjectableClass()
export class BuildCommand implements ICommand {

    @InjectProperty(IEnvironment_id)
    environment!: IEnvironment;

    @InjectProperty(IConfiguration_id)
    configuration!: IConfiguration;

    @InjectProperty(IDocker_id)
    docker!: IDocker;

    @InjectProperty(IFs_id)
    fs!: IFs;

    async invoke(): Promise<void> {

        //
        // The build command operates against the current working directory.
        // Or the path can be set with the --project=<path> argument.
        //
        const projectPath = this.configuration.getArg("project") || this.environment.cwd();

        //
        // Load the project's configuration file.
        //
        const configurationFilePath = joinPath(projectPath, "doulevo.json");
        const configurationFile = await this.fs.readJsonFile(configurationFilePath);
        const project = new Project(projectPath, configurationFile);

        const mode = this.configuration.getArg("mode") || "dev";
        if (mode !== "prod" && mode !== "dev") {
            throw new Error(`--mode can only be either "dev" or "prod".`);
        }

        //
        // Tags that can identify the image.
        //
        const tags = this.configuration.getArrayArg("tag");

        //
        // Load the plugin for this project.
        //
        const pluginPath = project.getLocalPluginPath();
        if (!pluginPath) {
            throw new Error(`Failed to determine local plugin path for project!`);
        }
        const pluginConfigurationFilePath = joinPath(pluginPath, "plugin.json");
        const pluginConfigurationFile = await this.fs.readJsonFile(pluginConfigurationFilePath);
        const plugin = new Plugin(pluginPath, pluginConfigurationFile); 
        
        //
        // Do the build.
        //
        // TODO: Choose the current build plugin (eg "build/docker") based on project configuration.
        //
        await this.docker.build(project, mode, tags, plugin);
    }
}

export default {
    name: "build",
    description: "Builds the project in the working directory (or the directory specified by --project=<path>).",
    constructor: BuildCommand,
};