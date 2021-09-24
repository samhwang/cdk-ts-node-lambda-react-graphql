import { Construct, RemovalPolicy, Stack } from '@aws-cdk/core';
import { Bucket } from '@aws-cdk/aws-s3';
import { ConstructProps } from './interface';

export default class JCashFEConstruct extends Construct {
    private siteBucket: Bucket;

    constructor(parent: Stack, name: string, props: ConstructProps) {
        super(parent, name);

        const stage = props.stage || 'dev';

        this.siteBucket = new Bucket(this, `JCashFEBucket-${stage}`, {
            bucketName: `jcash-frontend-bucket-${stage}`,
            websiteIndexDocument: 'index.html',
            websiteErrorDocument: 'index.html',
            publicReadAccess: true,
            removalPolicy: RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
        });
    }

    get bucket(): Bucket {
        return this.siteBucket;
    }
}
