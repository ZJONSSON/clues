module.exports.simple = {
  A: function(resolve) {
    setTimeout(function() {
      resolve(42);
    },200);
  },
  B: function(A,resolve) {
    setTimeout(function() {
      resolve("Answer is "+A);
    });
  },
  C : function(dflt,resolve) {
    resolve(dflt);
  },
  D : function(_U,resolve) {
    setTimeout(function() {
      resolve(_U);
    });
  },
  E : function(A,_U,resolve) {
    setTimeout(function() {
      resolve(A* (_U||2) );
    });
  },
  irrelevant : function(resolve) {
    setTimeout(function() {
      resolve("irrelevant");
    });
  },
  dflt : 999
};

module.exports.complex = {
  M1 : function(callback) {
    setTimeout(function() {
      callback(null,10);
    },100);
  },
  M2 : function(callback) {
    setTimeout(function() {
      callback(null,20);
    },300);
  },
  M3 : function(M1,M2,callback) {
    setTimeout(function() {
      callback(null,M1+M2);
    },50);
  },
  M4 : function(callback) {
    setTimeout(function() {
      callback(null,70);
    },150);
  },
  MTOP : function(M3,M4,callback) {
    callback(null,M3+M4);
  }
};