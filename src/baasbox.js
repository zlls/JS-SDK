/*!
 * BaasBox SDK 0.12.0
 * https://github.com/baasbox/JS-SDK
 *
 * Released under the Apache license
 */

import $ from 'jquery';

const BaasBox = (function BaasBoxFunc() {
  let instance;
  let user;
  const LS_KEY = 'baasbox';

  $.ajaxSetup({
    global: true,
    beforeSend: (r) => {
      if (BaasBox.getCurrentUser()) {
        r.setRequestHeader('X-BB-SESSION', BaasBox.getCurrentUser().token);
      }
      r.setRequestHeader('X-BAASBOX-APPCODE', BaasBox.appcode);
    },
  });

  function createInstance() {
    const object = new Object('I am the BaasBox instance'); // eslint-disable-line
    return object;
  }

  function setCurrentUser(userObject) {
    if (userObject === null) {
      return;
    }
    user = userObject;
    window.localStorage.setItem(LS_KEY, JSON.stringify(user));
  }

  function getCurrentUser() {
    if (window.localStorage.getItem(LS_KEY)) {
      user = JSON.parse(window.localStorage.getItem(LS_KEY));
    }
    return user;
  }

  function buildDeferred() {
    const dfd = new $.Deferred();
    const promise = {};
    promise.success = (fn) => {
      promise.then((data) => {
        fn(data);
      });
      return promise;
    };
    promise.error = (fn) => {
      promise.then(null, (error) => {
        fn(error);
      });
      return promise;
    };

    dfd.promise(promise);
    return dfd;
  }

  return {
    appcode: '',
    pagelength: 50,
    timeout: 20000,
    version: '0.12.0',
    // permission constants
    READ_PERMISSION: 'read',
    DELETE_PERMISSION: 'delete',
    UPDATE_PERMISSION: 'update',
    ALL_PERMISSION: 'all',

    // role constants, by default in the BaasBox back end
    ANONYMOUS_ROLE: 'anonymous',
    REGISTERED_ROLE: 'registered',
    ADMINISTRATOR_ROLE: 'administrator',

    isEmpty(ob) {
      for (const i in ob) { // eslint-disable-line
        return false;
      }
      return true;
    },

    getInstance() {
      if (!instance) {
        instance = createInstance();
      }
      return instance;
    },

    setEndPoint(endPointURL) {
      const regexp = /(http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/; // eslint-disable-line
      if (regexp.test(endPointURL)) {
        this.endPoint = endPointURL;
      } else {
        console.error(`${endPointURL} is not a valid URL`); // eslint-disable-line
      }
    },

    endPoint() {
      return this.endPoint;
    },

    login(userParam, pass) {
      const deferred = buildDeferred();
      const url = `${BaasBox.endPoint}/login`;
      $.post(url, {
        username: userParam,
        password: pass,
        appcode: BaasBox.appcode,
      })
        .done((res) => {
          const roles = [];
          $(res.data.user.roles).each((idx, r) => {
            roles.push(r.name);
          });
          setCurrentUser({
            username: res.data.user.name,
            token: res.data['X-BB-SESSION'],
            roles,
            visibleByAnonymousUsers: res.data.visibleByAnonymousUsers,
            visibleByTheUser: res.data.visibleByTheUser,
            visibleByFriends: res.data.visibleByFriends,
            visibleByRegisteredUsers: res.data.visibleByRegisteredUsers,
          });
          deferred.resolve(getCurrentUser());
        })
        .fail((error) => {
          deferred.reject(error);
        });
      return deferred.promise();
    },

    logout() {
      const deferred = buildDeferred();
      const u = getCurrentUser();
      if (u === null) {
        return deferred.reject({ data: 'ok', message: 'User already logged out' });
      }
      const url = `${BaasBox.endPoint}/logout`;
      $.post(url, {})
        .done(() => {
          window.localStorage.removeItem(LS_KEY);
          setCurrentUser(null);
          deferred.resolve({ data: 'ok', message: 'User logged out' })
            .fail((error) => {
              deferred.reject(error);
            });
        });
      return deferred.promise();
    },

    signup(userParam, pass, acl) {
      const deferred = buildDeferred();
      const url = `${BaasBox.endPoint}/user`;
      const postData = { username: userParam, password: pass };
      if (acl !== undefined || !this.isEmpty(acl)) {
        for (const prop in acl) { // eslint-disable-line
          postData[prop] = acl[prop];
        }
      }
      $.ajax({
        url,
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(postData),
      })
        .done((res) => {
          const roles = [];
          $(res.data.user.roles).each((idx, r) => {
            roles.push(r.name);
          });
          setCurrentUser({
            username: res.data.user.name,
            token: res.data['X-BB-SESSION'],
            roles,
            visibleByAnonymousUsers: res.data.visibleByAnonymousUsers,
            visibleByTheUser: res.data.visibleByTheUser,
            visibleByFriends: res.data.visibleByFriends,
            visibleByRegisteredUsers: res.data.visibleByRegisteredUsers,
          });
          deferred.resolve(getCurrentUser());
        })
        .fail((error) => {
          deferred.reject(error);
        });
      return deferred.promise();
    },

    getCurrentUser() {
      return getCurrentUser();
    },

    fetchCurrentUser() {
      return $.get(`${BaasBox.endPoint}/me`);
    },

    createCollection(collection) {
      return $.post(`${BaasBox.endPoint}/admin/collection/${collection}`);
    },

    deleteCollection(collection) {
      return $.ajax({
        url: `${BaasBox.endPoint}/admin/collection/${collection}`,
        method: 'DELETE',
      });
    },

    loadCollectionWithParams(collection, params) {
      const deferred = buildDeferred();
      const url = `${BaasBox.endPoint}/document/${collection}`;
      $.ajax({
        url,
        method: 'GET',
        timeout: BaasBox.timeout,
        dataType: 'json',
        data: params,
      })
        .done((res) => {
          deferred.resolve(res.data);
        })
        .fail((error) => {
          deferred.reject(error);
        });
      return deferred.promise();
    },

    loadCollection(collection) {
      const params = { page: 0, recordsPerPage: BaasBox.pagelength };
      return BaasBox.loadCollectionWithParams(collection, params);
    },

    loadObject(collection, objectId) {
      return $.get(`${BaasBox.endPoint}/document/${collection}/${objectId}`);
    },

    save(object, collection) {
      const deferred = buildDeferred();
      let method = 'POST';
      let url = `${BaasBox.endPoint}/document/${collection}`;
      if (object.id) {
        method = 'PUT';
        url = `${BaasBox.endPoint}/document/${collection}/${object.id}`;
      }
      const json = JSON.stringify(object);
      $.ajax({
        url,
        type: method,
        contentType: 'application/json',
        dataType: 'json',
        data: json,
      })
        .done((res) => {
          deferred.resolve(res.data);
        })
        .fail((error) => {
          deferred.reject(error);
        });
      return deferred.promise();
    },

    updateField(objectId, collection, fieldName, newValue) {
      const deferred = buildDeferred();
      const url = `${BaasBox.endPoint}/document/${collection}/${objectId}/.${fieldName}`;
      const json = JSON.stringify({
        data: newValue,
      });
      $.ajax({
        url,
        type: 'PUT',
        contentType: 'application/json',
        dataType: 'json',
        data: json,
      })
        .done((res) => {
          deferred.resolve(res.data);
        })
        .fail((error) => {
          deferred.reject(error);
        });
      return deferred.promise();
    },

    updateObject(objectId, collection, newData) {
      const deferred = buildDeferred();
      const url = `${BaasBox.endPoint}/document/${collection}/${objectId}`;
      $.ajax({
        url,
        type: 'PUT',
        contentType: 'application/json',
        dataType: 'json',
        data: JSON.stringify(newData),
      })
        .done((res) => {
          deferred.resolve(res.data);
        })
        .fail((error) => {
          deferred.reject(error);
        });
      return deferred.promise();
    },

    deleteObject(objectId, collection) {
      return $.ajax({
        url: `${BaasBox.endPoint}/document/${collection}/${objectId}`,
        method: 'DELETE',
      });
    },

    fetchObjectsCount(collection) {
      return $.get(`${BaasBox.endPoint}/document/${collection}/count`);
    },

    grantUserAccessToObject(collection, objectId, permission, username) {
      return $.ajax({
        url: `${BaasBox.endPoint}/document/${collection}/${objectId}/${permission}/user/${username}`,
        method: 'PUT',
      });
    },

    revokeUserAccessToObject(collection, objectId, permission, username) {
      return $.ajax({
        url: `${BaasBox.endPoint}/document/${collection}/${objectId}/${permission}/user/${username}`,
        method: 'DELETE',
      });
    },

    grantRoleAccessToObject(collection, objectId, permission, role) {
      return $.ajax({
        url: `${BaasBox.endPoint}/document/${collection}/${objectId}/${permission}/role/${role}`,
        method: 'PUT',
      });
    },

    revokeRoleAccessToObject(collection, objectId, permission, role) {
      return $.ajax({
        url: `${BaasBox.endPoint}/document/${collection}/${objectId}/${permission}/role/${role}`,
        method: 'DELETE',
      });
    },

    // only for json assets
    loadAssetData(assetName) {
      const deferred = buildDeferred();
      const url = `${BaasBox.endPoint}/asset/${assetName}/data`;
      $.ajax({
        url,
        method: 'GET',
        contentType: 'application/json',
        dataType: 'json',
      })
        .done((res) => {
          deferred.resolve(res.data);
        })
        .fail((error) => {
          deferred.reject(error);
        });
      return deferred.promise();
    },

    getImageURI(name, params) {
      const deferred = buildDeferred();
      let uri = `${BaasBox.endPoint}/asset/${name}`;
      let r;
      if (params === null || this.isEmpty(params)) {
        return deferred.resolve({ data: `${uri}?X-BAASBOX-APPCODE=${BaasBox.appcode}` });
      }
      for (const prop in params) { // eslint-disable-line
        const a = [];
        a.push(prop);
        a.push(params[prop]);
        r = a.join('/');
      }
      uri = uri.concat('/');
      uri = uri.concat(r);
      const p = {};
      p['X-BAASBOX-APPCODE'] = BaasBox.appcode;
      $.get(uri, p)
        .done(() => {
          deferred.resolve({ data: this.url });
        })
        .fail((error) => {
          deferred.reject(error);
        });
      return deferred.promise();
    },

    fetchUserProfile(username) {
      return $.get(`${BaasBox.endPoint}/user/${username}`);
    },

    fetchUsers(params) {
      return $.ajax({
        url: `${BaasBox.endPoint}/users`,
        method: 'GET',
        data: params,
      });
    },

    updateUserProfile(params) {
      return $.ajax({
        url: `${BaasBox.endPoint}/me`,
        method: 'PUT',
        contentType: 'application/json',
        data: JSON.stringify(params),
      });
    },

    changePassword(oldPassword, newPassword) {
      return $.ajax({
        url: `${BaasBox.endPoint}/me/password`,
        method: 'PUT',
        contentType: 'application/json',
        data: JSON.stringify({ old: oldPassword, new: newPassword }),
      });
    },

    resetPassword() {
      const currentUser = getCurrentUser();
      return $.get(`${BaasBox.endPoint}/user/${currentUser.username}/password/reset`);
    },

    followUser(username) {
      return $.post(`${BaasBox.endPoint}/follow/${username}`);
    },

    unfollowUser(username) {
      return $.ajax({
        url: `${BaasBox.endPoint}/follow/${username}`,
        method: 'DELETE',
      });
    },

    fetchFollowers(username) {
      return $.get(`${BaasBox.endPoint}/followers/${username}`);
    },

    fetchFollowing(username) {
      return $.get(`${BaasBox.endPoint}/following/${username}`);
    },

    sendPushNotification(params) {
      return $.ajax({
        url: `${BaasBox.endPoint}/push/message`,
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(params),
      });
    },

    uploadFile(formData) {
      return $.ajax({
        url: `${BaasBox.endPoint}/file`,
        type: 'POST',
        data: formData,
        mimeType: 'multipart/form-data',
        contentType: false,
        cache: false,
        processData: false,
      });
    },

    fetchFile(fileId) {
      return $.get(`${BaasBox.endPoint}/file/${fileId}?X-BB-SESSION=${BaasBox.getCurrentUser().token}`);
    },

    deleteFile(fileId) {
      return $.ajax({
        url: `${BaasBox.endPoint}/file/${fileId}`,
        method: 'DELETE',
      });
    },

    fetchFileDetails(fileId) {
      return $.get(`${BaasBox.endPoint}/file/details/${fileId}`);
    },

    grantUserAccessToFile(fileId, permission, username) {
      return $.ajax({
        url: `${BaasBox.endPoint}/file/${fileId}/${permission}/user/${username}`,
        method: 'PUT',
      });
    },

    revokeUserAccessToFile(fileId, permission, username) {
      return $.ajax({
        url: `${BaasBox.endPoint}/file/${fileId}/${permission}/user/${username}`,
        method: 'DELETE',
      });
    },

    grantRoleAccessToFile(fileId, permission, rolename) {
      return $.ajax({
        url: `${BaasBox.endPoint}/file/${fileId}/${permission}/role/${rolename}`,
        method: 'PUT',
      });
    },

    revokeRoleAccessToFile(fileId, permission, rolename) {
      return $.ajax({
        url: `${BaasBox.endPoint}/file/${fileId}/${permission}/role/${rolename}`,
        method: 'DELETE',
      });
    },

    /* API for calling a plugin with params */
    callPlugin(pluginName, method, data) {
      const deferred = buildDeferred();
      $.ajax({
        url: `${BaasBox.endPoint}/plugin/${pluginName}`,
        method: method.toLowerCase(),
        data: JSON.stringify(data),
        contentType: 'application/json',
        dataType: 'json',
      })
        .done((res) => {
          deferred.resolve(res);
        })
        .fail((error) => {
          deferred.reject(error);
        });
      return deferred.promise();
    },

  };
}());

export default BaasBox;
