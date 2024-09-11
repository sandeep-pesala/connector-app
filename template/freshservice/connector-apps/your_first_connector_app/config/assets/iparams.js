// API Methods

var getJwtToken = function(authInfo) {
  return client.request.invokeTemplate("fetchToken", { context: {
      api_key: authInfo.fs_apikey,
      domain: authInfo.fs_domain
  }});
}

var initCreation = function(authInfo) {
  return client.request.invokeTemplate("initTenantCreation", { context: {
      api_key: authInfo.fs_apikey,
      domain: authInfo.fs_domain,
      app_name: "SampleApp"
  }});
}

var fetchTenant = function (authInfo) {
  return client.request.invokeTemplate("fetchTenant", { context: {
      api_key: authInfo.fs_apikey,
      domain: authInfo.fs_domain,
      app_name: "SampleApp"
  }});
}

var updateConnection = function (authInfo) {
  return client.request.invokeTemplate("updateConnection", { context: {
      api_key: authInfo.fs_apikey,
      domain: authInfo.fs_domain,
      connection_id: authInfo.connection_id
  },
  body: JSON.stringify({customer_id: authInfo.customer_id, provider: 'freshservice'}) });
}

var getConnections = function (authInfo) {
  return client.request.invokeTemplate("listConnections", { context: {
      folder_id: authInfo.folder_id,
      api_key: authInfo.fs_apikey,
      domain: authInfo.fs_domain,
  }});
}
