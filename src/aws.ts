import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import AWS from 'aws-sdk';
import dotenv from 'dotenv';
import { Vendor } from 'aws-sdk/clients/directconnect';
import { AttributeValue } from '@aws-sdk/client-dynamodb';

dotenv.config();

AWS.config.update({ region: process.env.AWS_REGION });

const { DynamoDB, SQS } = AWS;

const dynamodb = new DynamoDB();
const sqs = new SQS();

// describe a table
export const dynamodbDescribeTable = async (tableName: string) => {
  try {
    const table = await dynamodb
      .describeTable({
        TableName: tableName,
      })
      .promise();
    console.log('Table retrieved', table);
    return table;
  } catch (e) {
    if (e instanceof Error) {
      throw e;
    }
    throw new Error(
      `dynamodbDescribeTable error object unknown type`
    );
  }
};

// scan a table
export const dynamodbScanTable = async function* (
  tableName: string,
  limit: number = 25,
  lastEvaluatedKey?: AWS.DynamoDB.Key
) {
  while (true) {
    const params: AWS.DynamoDB.ScanInput = {
      TableName: tableName,
      Limit: limit,
    };

    if (lastEvaluatedKey) {
      params.ExclusiveStartKey = lastEvaluatedKey;
    }

    try {
      const result = await dynamodb.scan(params).promise();
      if (!result.Count) {
        return;
      }

      lastEvaluatedKey = (result as AWS.DynamoDB.ScanOutput)
        .LastEvaluatedKey;
        result.Items = result.Items?.map((item) => unmarshall(item as Record<Vendor, AttributeValue>));
        yield result;
    } catch (e) {
      if (e instanceof Error) {
        throw e;
      }
      throw new Error('dynamodbScanTable unexpected error');
    }
  }
};

// scan all results
export const getAllScanResults = async <T>(
  tableName: string,
  limit: number = 25
) => {
  try {
    await dynamodbDescribeTable(tableName);

    const scanTableGen = await dynamodbScanTable(tableName, limit);

    const results: T[] = [];
    let isDone = false;

    while (!isDone) {
      const iterator = await scanTableGen.next();

      if (!iterator) {
        throw new Error('No iterator returned');
      }

      if (iterator.done || !iterator.value.LastEvaluatedKey) {
        isDone = true;
      }

      if (iterator.value) {
        iterator.value.Items!.forEach((result: any) =>
          results.push(result)
        );
      }
    }

    return results;
  } catch (e) {
    if (e instanceof Error) {
      throw e;
    }

    throw new Error(`getAllScanResults unexpected error`);
  }
};

// Add a connection
export const dynamoDbAddConnection = async (
  tableName: string,
  connectionId: string
) => {
  try {
    const params: AWS.DynamoDB.PutItemInput = {
      TableName: tableName,
      Item: marshall({ connectionId }),
    };

    const res = await dynamodb.putItem(params).promise();

    return res;
  } catch (e) {
    if (e instanceof Error) {
      return e;
    }
    return new Error(
      'dynamoDbAddConnection error object unknown type'
    );
  }
};

// const execAddConnection = async () => {
//   const res = await dynamoDbAddConnection(
//     'websocket-connections',
//     '123'
//   );
//   console.log(res);
// };

// execAddConnection();

// Remove a connection
export const dynamoDbRemoveConnection = async (
  tableName: string,
  connectionId: string
) => {
  try {
    const params: AWS.DynamoDB.DeleteItemInput = {
      TableName: tableName,
      Key: {
        connectionId: marshall(connectionId),
      },
    };

    const res = await dynamodb.deleteItem(params).promise();

    return res;
  } catch (e) {
    if (e instanceof Error) {
      return e;
    }
    return new Error(
      'dynamoDbRemoveConnection error object unkown type'
    );
  }
};

// const execRemoveConnection = async () => {
//   const res = await dynamoDbRemoveConnection(
//     'websocket-connections',
//     '123'
//   );
//   console.log(res);
// };

// execRemoveConnection();

export const sqsDeleteMessage = async (
  queueUrl: string,
  receiptHandle: string
) => {
  try {
    const params: AWS.SQS.DeleteMessageRequest = {
      ReceiptHandle: receiptHandle,
      QueueUrl: queueUrl,
    };

    const res = await sqs.deleteMessage(params).promise();
    console.log('Message deleted!');
    return res;
  } catch (e) {
    if (e instanceof Error) {
      return e;
    }

    return new Error(`sqsDeleteMessage error object unknown type`);
  }
};

// const execSqsDeleteMessage = async () => {
//   const receiptHandle =
//     'AQEBXOBjscrUswJ0qbmhw8+PwrYppxfiWAeUERVfnpD00FKylCVcY5MnmIikhu7Q0eAbHxREzopHXbrz8OrzkgB9Ad9fuluXrsut4ohKwyklhtWrENp9cks/FpjdUZ448WbOggWl3q6x8VvmktWU9KukWmahpIaVo4MirJB6eyfLSSM0kJIjnjWHzEpTGkZoBW69guCU8F9gsfUKQw5c4XaETiDhv4elv4yTEulhE+sxyoAHIdS/ZLI2ANk+33je1a9h3cP8lZJ9T0vv4K9COWgoSBJ/qdsJZK2KhvfNtcG3MD5NEHc0wcy17AEhmgw2nhYuWX3EEQRv0URt5Cm/uwGx2y6rTrJAgpjmMrMBg7QdqGHCG56OcHSURQoSjRyVNIwn3HvYtz+j6LoCaFE8YjT4iw==';
//   const res = await sqsDeleteMessage(
//     'https://sqs.us-east-1.amazonaws.com/134152526579/vendor-twitter-queue',
//     receiptHandle
//   );
//   console.log(res);
// };

// execSqsDeleteMessage();