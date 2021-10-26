import path from 'path';
import { Stack, Construct, StackProps } from '@aws-cdk/core';
import { BucketDeployment, Source } from '@aws-cdk/aws-s3-deployment';
import {
    CloudFrontWebDistribution,
    CloudFrontAllowedMethods,
    CloudFrontAllowedCachedMethods,
    ViewerProtocolPolicy,
    PriceClass,
} from '@aws-cdk/aws-cloudfront';
import AppBEConstruct from './appBEConstruct';
import AppFEConstruct from './appFEConstruct';

export class AppStack extends Stack {
    constructor(scope: Construct, id: string, props: StackProps) {
        super(scope, id, props);

        const stage = props.tags?.stage || 'dev';
        const region = props.env?.region || 'ap-southeast-2';

        const BEConstruct = new AppBEConstruct(this, `AppBE-${stage}`, {
            stage,
            region,
        });
        const BEApi = BEConstruct.api;
        const FEConstruct = new AppFEConstruct(this, `AppFE-${stage}`, {
            stage,
        });
        const FEBucket = FEConstruct.bucket;

        const cfDistribution = new CloudFrontWebDistribution(
            this,
            'AppDistribution',
            {
                originConfigs: [
                    {
                        s3OriginSource: {
                            s3BucketSource: FEBucket,
                        },
                        behaviors: [
                            {
                                isDefaultBehavior: true,
                                compress: true,
                                allowedMethods: CloudFrontAllowedMethods.ALL,
                                cachedMethods:
                                    CloudFrontAllowedCachedMethods.GET_HEAD_OPTIONS,
                                forwardedValues: {
                                    queryString: true,
                                    cookies: {
                                        forward: 'none',
                                    },
                                    headers: [
                                        'Access-Control-Request-Headers',
                                        'Access-Control-Request-Method',
                                        'Origin',
                                    ],
                                },
                            },
                        ],
                    },
                    {
                        customOriginSource: {
                            domainName: `${BEApi.restApiId}.execute-api.${this.region}.${this.urlSuffix}`,
                            originPath: `/${BEApi.deploymentStage.stageName}`,
                        },
                        behaviors: [
                            {
                                pathPattern: '/api/*',
                                allowedMethods: CloudFrontAllowedMethods.ALL,
                            },
                        ],
                    },
                ],
                errorConfigurations: [
                    {
                        errorCode: 403,
                        responseCode: 200,
                        responsePagePath: '/index.html',
                    },
                    {
                        errorCode: 404,
                        responseCode: 200,
                        responsePagePath: '/index.html',
                    },
                ],
                comment: 'App CloudFront Distribution',
                viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                priceClass: PriceClass.PRICE_CLASS_ALL,
            }
        );

        new BucketDeployment(this, 'DeployWithInvalidation', {
            sources: [Source.asset(path.resolve('..', 'frontend', 'build'))],
            destinationBucket: FEBucket,
            distribution: cfDistribution,
            distributionPaths: ['/*'],
        });
    }
}