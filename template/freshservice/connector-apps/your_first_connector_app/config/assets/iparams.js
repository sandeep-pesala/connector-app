// API Methods

const appName = 'sampleapp'

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
      app_name: appName
  }});
}

var fetchTenant = function (authInfo) {
  return client.request.invokeTemplate("fetchTenant", { context: {
      api_key: authInfo.fs_apikey,
      domain: authInfo.fs_domain,
      app_name: appName
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

var fetchAlertConfig = function (authInfo) {
  return client.request.invokeTemplate('fetchAlertConfig', { context: {
      api_key: authInfo.fs_apikey,
      domain: authInfo.fs_domain,
      app_name: appName
  }});
}

var updateAlertConfig = function (authInfo, alertConf, alertRecipeConnParams) {
  return client.request.invokeTemplate('updateAlertConfig', { context: {
      api_key: authInfo.fs_apikey,
      domain: authInfo.fs_domain,
      app_name: appName
  },
  body: JSON.stringify({ 
      ...alertConf,
      folder_id: authInfo.folder_id, 
      connections: alertRecipeConnParams
  }) });
}

var fetchAgents = function (authInfo, queryStr) {
  return client.request.invokeTemplate('fetchAgents', { context: {
      api_key: authInfo.fs_apikey,
      domain: authInfo.fs_domain,
      query_params: `query=~[email]:'${queryStr}'`
  }});
}
