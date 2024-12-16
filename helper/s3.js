const { 

  S3Client, CreateBucketCommand, ListBucketsCommand, 
  DeleteBucketCommand, ListObjectsCommand, 
  GetObjectCommand, PutObjectCommand, DeleteObjectsCommand 

} = require('@aws-sdk/client-s3');
  
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const fs = require('fs');

const s3 = process.env.S3_REGION ? 
  new S3Client({ signatureVersion: 'v4', region: process.env.S3_REGION }) : 'No S3 region specified'

/*
* s3.bucket()
* return a list of buckets on your s3 account
*/

exports.bucket = async function(){

  return await s3.send(new ListBucketsCommand({}));

}

/*
* s3.bucket.items()
* return a list of items in the bucket
*/

exports.bucket.items = async function(bucket){

  return await s3.send(new ListObjectsCommand({ Bucket: bucket }));

}

/*
* s3.bucket.create()
* create a new s3 bucket
*/

exports.bucket.create = async function(name){

  return await s3.send(new CreateBucketCommand({ Bucket: name }));

}

/*
* s3.bucket.delete()
* delete an empty s3 bucket
*/

exports.bucket.delete = async function(name){

  // delete the bucket
  return await s3.send(new DeleteBucketCommand({ Bucket: name }));

}

/*
* s3.upload()
* upload a file to a bucket
* pass the bucket name and file object
*/

exports.upload = async function({ bucket, file, buffer, acl }){

  // upload it to s3
  const content = buffer || fs.readFileSync(file.path);

  await s3.send(new PutObjectCommand({

    Bucket: bucket || process.env.S3_BUCKET,
    Key: file.originalname,
    Body: content,
    ContentType: file.mimetype,
    ...acl && { ACL: acl },

  }));

  return `https://${process.env.S3_BUCKET}.s3.${process.env.S3_REGION}.amazonaws.com/${file.originalname}`;

}

/*
* s3.delete()
* delete a file from a bucket
*/

exports.delete = async function({ bucket, filename, url }){

  let objects = [];

  if (filename){
    
    objects = Array.isArray(filename) ? 
    filename.map(x => { return { Key: filename }}) :
    [{ Key: filename }];

  }

  if (url)
    objects = [{ Key: url.split('amazonaws.com/')[1] }]

  return await s3.send(new DeleteObjectsCommand({

    Bucket: bucket  || process.env.S3_BUCKET,
    Delete: { Objects: objects }

  }))
}

/*
* s3.signedURL()
* get a signed url
*/
exports.signedURL = async function({ filename, bucket, expires, acl }){

  return await getSignedUrl(s3, new GetObjectCommand({
    
    Bucket: bucket || process.env.S3_BUCKET,
    Key: filename,
    ...acl && { ACL: acl },

  }), { expiresIn: expires || 3600 });
}