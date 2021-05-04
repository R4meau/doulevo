import * as fs from "fs-extra";
import { exportTemplate } from "inflate-template";
import { ICommand } from "../lib/command";
import { IPluginManager, IPluginManager_id } from "../services/plugin-manager";
import { InjectableClass, InjectProperty } from "@codecapers/fusion";
import * as inquirer from "inquirer";
import { IConfiguration, IConfiguration_id } from "../services/configuration";
import { ILog, ILog_id } from "../services/log";
import { runCmd } from "../lib/run-cmd";
import { joinPath } from "../lib/join-path";

@InjectableClass()
class CreateCommand implements ICommand {

    @InjectProperty(IPluginManager_id)
    pluginManager!: IPluginManager;

    @InjectProperty(IConfiguration_id)
    configuration!: IConfiguration;

    @InjectProperty(ILog_id)
    log!: ILog;

    async invoke(): Promise<void> {
    
        const projectDir = this.configuration.getMainCommand();
        if (!projectDir) {
            throw new Error(`Project directory not specified. Use "doulevo create <project-dir>`);
        }
    
        const projectPath = joinPath(process.cwd(), projectDir);
        const projectExists = await fs.pathExists(projectPath);
        if (projectExists) {
            const force = this.configuration.getArg<boolean>("force");
            if (force) {
                await fs.remove(projectPath);
            }
            else {
                throw new Error(`Directory already exists at ${projectPath}, please delete the existing directory if you want to create a new project here`);
            }
        }
    
        //
        // Clone or update the plugin requested by the configuration.
        //
        await this.pluginManager.updatePlugin();
    
        // TODO: Fill out answers already provided on the command line.
        //    --answer=PROJECT_NAME=something etc
    
        let createQuestions = [
            {
                type: "input",
                name: "PROJECT_NAME",
                message: "Please enter the name of your project: ",
                default: "new-project",
            },
            {
                type: "input",
                name: "PROJECT_DESCRIPTION",
                message: "Please enter a description of your project: ",
                default: "A new project",
            },
        ];

        const localTemplatePath = this.configuration.getCreateTemplatePath();
        const templateConfigFilePath = joinPath(localTemplatePath, "template.json");
        const templateConfigExists = await fs.pathExists(templateConfigFilePath);
        if (templateConfigExists) {
            const templateConfig = JSON.parse(await fs.readFile(templateConfigFilePath, "utf8"));
            if (templateConfig.questions !== undefined) {
                if (!Array.isArray(templateConfig.questions)) {
                    throw new Error(`Expected "questions" field in template config file ${templateConfigFilePath} to be an array of questions in the inquirer format (see https://www.npmjs.com/package/inquirer#question).`)
                }
    
                createQuestions = createQuestions.concat(templateConfig.questions);
            }
        }
    
        this.log.debug("Create questions:");
        this.log.debug(createQuestions);
    
        //
        // Ask questions required by the template.
        //
        const templateData = await inquirer.prompt(createQuestions);
    
        this.log.debug("Template data:");
        this.log.debug(templateData);
    
        //
        // Instantiate template and fill in the blanks from the questions.
        //
        await exportTemplate(localTemplatePath, templateData, projectPath);

        //
        // Create the Doulevo config file.
        //
        const configFilePath = joinPath(projectPath, "doulevo.json");
        const defaultConfig = {
            projectType: this.configuration.getProjectType(),
            localPluginPath: this.configuration.getRelativePluginPath(),
            pluginUrl: this.configuration.getPluginUrl(),
        };
        await fs.writeFile(configFilePath, JSON.stringify(defaultConfig, null, 4));

        await runCmd(`git init`, { cwd: projectPath });
        await runCmd(`git add .`, { cwd: projectPath });
        await runCmd(`git commit -m "Project generated from Doulevo template."`, { cwd: projectPath });
    
        this.log.info(`Created project at ${projectPath}`)
    } 
}

export default {
    name: "create",
    description: "Creates a new Doulevo project.",
    constructor: CreateCommand,
};