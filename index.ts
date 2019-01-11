import * as aws from "@pulumi/aws";
import * as awsinfra from "@pulumi/aws-infra";
import * as pulumi from "@pulumi/pulumi";
import * as eks from "@pulumi/eks";

// Get configuration for the stack
const config = new pulumi.Config();
const instanceType = config.get("instanceType") as aws.ec2.InstanceType;
const desiredCapacity = config.getNumber("desiredCapacity");
const minSize = config.getNumber("minSize");
const maxSize = config.getNumber("maxSize");
const storageClass = config.get("storageClass") as eks.EBSVolumeType;
const deployDashboard = config.getBoolean("deployDashboard");
const identityStackName = config.require("identityStackName");

// Create a reference to the identity stack.
const identityStack = new pulumi.StackReference("identityStack", { name: identityStackName });

// Get the identity stack's outputs.
const infraRoleArn = identityStack.getOutput("infraRoleArn");
const appRoleArn = identityStack.getOutput("appRoleArn");

// Create a VPC for our cluster.
const network = new awsinfra.Network("eksNetwork");

// Create an EKS cluster with the given configuration.
const cluster = new eks.Cluster(
    "cluster",
    {
        vpcId: network.vpcId,
        subnetIds: network.subnetIds,
        instanceType: instanceType,
        desiredCapacity: desiredCapacity,
        minSize: minSize,
        maxSize: maxSize,
        storageClasses: storageClass,
        deployDashboard: deployDashboard,
        roleMappings: [
            {
                roleArn: infraRoleArn,
                username: infraRoleArn,
                groups: ["system:masters"],
            },
            {
                roleArn: appRoleArn,
                username: appRoleArn,
                groups: ["system:masters"],
            },
        ]
    }
);

// Export the cluster's kubeconfig.
export const kubeconfig = cluster.kubeconfig;
