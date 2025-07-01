# vcf-operations-orchestrator-doc-generator
This tool is intended for use with repositories managed by the **Build Tools for VMware Aria** and is designed to automatically generate documentation for all VCF Operations Orchestrator Actions.

## Requirements
#️⃣Node.js (should already be installed and available when using Build Tools for VMware Aria)  
#️⃣Source code checked out locally

## Usage
```node vcf-operations-orchestrator-doc-generator.js <actions_root_directory> <docs_output_directory>```

Example:  
```node vcf-operations-orchestrator-doc-generator.js source\vro-actions\src\main\resources\ .\docs```  

🗒️The **docs_output_directory** will automatically be created if it doesn't exist  

⚠️Ensure the **actions_root_directory** is the top-level directory for the Orchestrator Actions.

## Features
#️⃣Documents Actions that are used as Class wrappers  
#️⃣Documents standard Actions and creates a single document based on the parent directory  
#️⃣Adds the module path  
#️⃣For Classes, detects inheritance (extends)  
#️⃣Documents all functions (prototype-based and inline)  
#️⃣Documents all parameters and returns  
#️⃣Preserves examples and displays them in JavaScript highlighting  
#️⃣Outputs in Markdown (md) files  
#️⃣Creates a root-level README linking to all sub-pages  
#️⃣Documentation folder structure honours the code hierarchy

## Example of Class documentation
![image](https://github.com/user-attachments/assets/47eaf2dc-22d2-4f94-9f03-39afa51e0d39)

## Example of standard Action documentation
![image](https://github.com/user-attachments/assets/37635f61-c978-4328-a369-ad94a3d14cd2)

## Example of top-level README  
![image](https://github.com/user-attachments/assets/113dc1dc-a05f-4d54-b698-5ff6c4524b32)
