﻿using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.WindowsAzure.Storage;
using Microsoft.WindowsAzure.Storage.Table;

using CicoService.Storage.Contracts;

namespace CicoService.Storage
{
    public class StorageProvider
    {
        private const string UserTable = "users";
        private const string RequestTable = "requests";

        private Lazy<CloudStorageAccount> storageAccount;
        private Lazy<CloudTableClient> tableClient;
        private AsyncLazy<CloudTable> userTable;
        private AsyncLazy<CloudTable> requestTable;

        public StorageProvider(string connectionString)
        {
            this.storageAccount = new Lazy<CloudStorageAccount>(() =>
            {
                return CloudStorageAccount.Parse(connectionString);
            });

            this.tableClient = new Lazy<CloudTableClient>(() =>
            {
                return storageAccount.Value.CreateCloudTableClient();
            });

            this.userTable = new AsyncLazy<CloudTable>(async () =>
            {
                var table = tableClient.Value.GetTableReference(UserTable);
                await table.CreateIfNotExistsAsync();
                return table;
            });

            this.requestTable = new AsyncLazy<CloudTable>(async () =>
            {
                var table = tableClient.Value.GetTableReference(RequestTable);
                await table.CreateIfNotExistsAsync();
                return table;
            });
        }

        public async Task<UserEntity> RetrieveUser(string id)
        {
            var table = await userTable.Value;
            var retrieveOperation = TableOperation.Retrieve<UserEntity>(id, id);

            var tableResult = await table.ExecuteAsync(retrieveOperation);

            return (UserEntity)tableResult.Result;
        }

        public async Task<string> CreateUser(string id, string firstName, string lastName)
        {
            var table = await userTable.Value;
            var user = new UserEntity(id, firstName, lastName);
            var insertOperation = TableOperation.InsertOrReplace(user);

            await table.ExecuteAsync(insertOperation);

            return user.RowKey;
        }

        public async Task<IEnumerable<RequestEntity>> RetrieveRequests(RequestType type)
        {
            var table = await requestTable.Value;
            var retrieveQueryFilter = TableQuery.GenerateFilterConditionForInt("Type", QueryComparisons.Equal, (int)type);
            var retrieveQuery = new TableQuery<RequestEntity>()
            {
                FilterString = retrieveQueryFilter
            };

            var continuationToken = default(TableContinuationToken);
            var tableResult = await table.ExecuteQuerySegmentedAsync(retrieveQuery, continuationToken);

            return tableResult.Results;
        }

        public async Task<string> CreateRequest(string currency, decimal amount, string serialNumber, RequestType type)
        {
            var table = await requestTable.Value;
            var request = new RequestEntity(currency, amount, serialNumber, type);
            var insertOperation = TableOperation.InsertOrReplace(request);

            await table.ExecuteAsync(insertOperation);

            return request.RowKey;
        }
    }
}
