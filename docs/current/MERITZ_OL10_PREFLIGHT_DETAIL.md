# Meritz Oracle Linux 10 detailed source evidence

- Collected: 2026-09-12 10:23:15 +09:00
- Source: `C:\Users\c\Downloads\meritz-main\meritz`
- Scope: build descriptors, deployment manuals, Dockerfiles, shell/config files, and application configuration.
- Safety: likely password, token, credential, and key values are redacted.

## Selected files (60)

### `chat-ui\pom.xml`

~~~text
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <parent>
        <groupId>com.kt.aicc</groupId>
        <version>0.0.1-SNAPSHOT</version>
        <artifactId>ktbot</artifactId>
    </parent>
    <modelVersion>4.0.0</modelVersion>

    <artifactId>chat-ui</artifactId>
    <version>0.0.1-SNAPSHOT</version>
    <packaging>jar</packaging>

    <dependencies>
        <dependency>
            <groupId>com.kt.aicc</groupId>
            <artifactId>common</artifactId>
            <version>${project.version}</version>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
            <exclusions>
                <exclusion>
                    <groupId>org.springframework.boot</groupId>
                    <artifactId>spring-boot-starter-tomcat</artifactId>
                </exclusion>
            </exclusions>
        </dependency>

        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-thymeleaf</artifactId>
            <exclusions>
                <exclusion>
                    <groupId>org.springframework.boot</groupId>
                    <artifactId>spring-boot-starter-tomcat</artifactId>
                </exclusion>
            </exclusions>
        </dependency>

        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-undertow</artifactId>
            <scope>provided</scope>
        </dependency>

        <dependency>
            <groupId>junit</groupId>
            <artifactId>junit</artifactId>
            <version>4.12</version>
            <scope>test</scope>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
            </plugin>
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-compiler-plugin</artifactId>
                <version>3.1</version>
                <configuration>
                    <source>${java.version}</source>
                    <target>${java.version}</target>
                </configuration>
            </plugin>
        </plugins>
    </build>
</project>
~~~

### `chat-ui\src\main\resources\application-dev.yml`

~~~text
server:
  port: 8480
  servlet:
    context-path: /client

logging:
  config: classpath:logging-dev-config.xml

spring:
  profiles:
    include: core-dev
  devtools:
    livereload:
      enabled: true
  freemarker:
    cache: false

  thymeleaf:
    prefix: classpath:templates/
    check-template-location: true
    suffix: .html
    mode: HTML5
    cache: false
    order: 0

ibot:
  gateway:
    domain: http://localhost:8081/gateway
  websocket:
    domain: 10.213.177.159:1080/gateway/ws
  public-key: MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC0u8apmRkoGHTqBoZjM4KvNummePD5smP7dwZQDfB9TVucfa8stDXuAyNkBBEOnPnEYqpjPldV2Z7gd9pwxqzuKskL0kHZXFI+Ezc4dGtLSYx2btyF6/oWfPdJ9zQ8ECWkWAppqxLA+Gi2rnnbQ8/tLMrdn5/42eBz3WXjEKtPgwIDAQAB

login:
  redirect-url: https://ibot.kt.com/client
  wamui:
    web-url: https://login.kt.com/wamui/AthWeb.do
    mobile-url: https://login.kt.com/wamui/AthMobile.do
    app-url: https://login.kt.com/wamui/appLogin.do
  pass:
    cp-id: KBZM1017
    url-code: '010001'
    url: https://www.kmcert.com/kmcis/web/kmcisReq.jsp

mykt:
  app:
    update:
      url: https://wsgadd.kt.com/wsg2/app/s_AppLink.do?ch=ME&key=33a03d84b32d&appCd=appUpdate


bot:
  code:
    default: BASIC
client:
  url: http://localhost:8480
~~~

### `chat-ui\src\main\resources\application-prod.yml`

~~~text
server:
  port: 8480
  servlet:
    context-path: /client

logging:
  config: classpath:logging-prod-config.xml

spring:
  profiles:
    include: core-prod
  devtools:
    livereload:
      enabled: true
  freemarker:
    cache: false

  thymeleaf:
    prefix: classpath:templates/
    check-template-location: true
    suffix: .html
    mode: HTML5
    cache: false
    order: 0

ibot:
  gateway:
    domain: http://10.20.30.243:8081/gateway
  websocket:
    domain: 10.213.177.159:1080/gateway/ws
  public-key: MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC0u8apmRkoGHTqBoZjM4KvNummePD5smP7dwZQDfB9TVucfa8stDXuAyNkBBEOnPnEYqpjPldV2Z7gd9pwxqzuKskL0kHZXFI+Ezc4dGtLSYx2btyF6/oWfPdJ9zQ8ECWkWAppqxLA+Gi2rnnbQ8/tLMrdn5/42eBz3WXjEKtPgwIDAQAB

login:
  redirect-url: https://ibot.kt.com/client
  wamui:
    web-url: https://login.kt.com/wamui/AthWeb.do
    mobile-url: https://login.kt.com/wamui/AthMobile.do
    app-url: https://login.kt.com/wamui/appLogin.do
  pass:
    cp-id: KBZM1017
    url-code: '010001'
    url: https://www.kmcert.com/kmcis/web/kmcisReq.jsp

mykt:
  app:
    update:
      url: https://wsgadd.kt.com/wsg2/app/s_AppLink.do?ch=ME&key=33a03d84b32d&appCd=appUpdate


bot:
  code:
    default: BASIC
client:
  url: http://10.20.30.243:8480
~~~

### `chat-ui\src\main\resources\application-tc.yml`

~~~text
server:
  port: 8480
  servlet:
    context-path: /client

logging:
  config: classpath:logging-tc-config.xml

spring:
  profiles:
    include: core-tc
  devtools:
    livereload:
      enabled: true
  freemarker:
    cache: false

  thymeleaf:
    prefix: classpath:templates/
    check-template-location: true
    suffix: .html
    mode: HTML5
    cache: false
    order: 0

ibot:
  gateway:
    domain: http://gateway:8081/gateway
  websocket:
    domain: gateway:1080/gateway/ws
  public-key: MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC0u8apmRkoGHTqBoZjM4KvNummePD5smP7dwZQDfB9TVucfa8stDXuAyNkBBEOnPnEYqpjPldV2Z7gd9pwxqzuKskL0kHZXFI+Ezc4dGtLSYx2btyF6/oWfPdJ9zQ8ECWkWAppqxLA+Gi2rnnbQ8/tLMrdn5/42eBz3WXjEKtPgwIDAQAB

login:
  redirect-url: https://ibot.kt.com/client
  wamui:
    web-url: https://login.kt.com/wamui/AthWeb.do
    mobile-url: https://login.kt.com/wamui/AthMobile.do
    app-url: https://login.kt.com/wamui/appLogin.do
  pass:
    cp-id: KBZM1017
    url-code: '010001'
    url: https://www.kmcert.com/kmcis/web/kmcisReq.jsp

mykt:
  app:
    update:
      url: https://wsgadd.kt.com/wsg2/app/s_AppLink.do?ch=ME&key=33a03d84b32d&appCd=appUpdate


bot:
  code:
    default: BASIC
client:
  url: http://localhost:8480
~~~

### `cms\Dockerfile`

~~~text
FROM amazoncorretto:8-alpine-jre AS run

# --- 캡챠 문제 해결을 위해 ---
# freetype: 폰트 렌더링 엔진
# fontconfig: 폰트 관리 시스템
# ttf-dejavu: 기본 폰트 파일
RUN apk add --no-cache \
    freetype \
    fontconfig \
    ttf-dejavu

ARG PROFILE=dev
ENV SPRING_PROFILES_ACTIVE=${PROFILE}

RUN addgroup -S app && adduser -S app -G app
USER app

WORKDIR /app

ARG JAR_FILE=app.jar
COPY ${JAR_FILE} /app/app.jar

EXPOSE 8380

ENTRYPOINT ["java", "-Djava.awt.headless=true", "-Xms256m", "-Xmx2048m", "-jar", "/app/app.jar"]
~~~

### `cms\pom.xml`

~~~text
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <parent>
        <groupId>com.kt.aicc</groupId>
        <version>0.0.1-SNAPSHOT</version>
        <artifactId>ktbot</artifactId>
    </parent>
    <modelVersion>4.0.0</modelVersion>

    <artifactId>cms</artifactId>
    <version>0.0.1-SNAPSHOT</version>
    <packaging>jar</packaging>

    <dependencies>
        <dependency>
            <groupId>com.kt.aicc</groupId>
            <artifactId>persistence</artifactId>
            <version>${project.version}</version>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-undertow</artifactId>
            <scope>provided</scope>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
            <exclusions>
                <exclusion>
                    <groupId>org.springframework.boot</groupId>
                    <artifactId>spring-boot-starter-tomcat</artifactId>
                </exclusion>
            </exclusions>
        </dependency>

        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-thymeleaf</artifactId>
            <exclusions>
                <exclusion>
                    <groupId>org.springframework.boot</groupId>
                    <artifactId>spring-boot-starter-tomcat</artifactId>
                </exclusion>
            </exclusions>
        </dependency>

        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-cache</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-security</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.batch</groupId>
            <artifactId>spring-batch-core</artifactId>
        </dependency>
        <dependency>
            <groupId>org.ehcache</groupId>
            <artifactId>ehcache</artifactId>
            <version>${ehcache.version}</version>
        </dependency>
        <dependency>
            <groupId>javax.cache</groupId>
            <artifactId>cache-api</artifactId>
            <version>${cacheApi.version}</version>
        </dependency>
        <dependency>
            <groupId>org.apache.poi</groupId>
            <artifactId>ooxml-schemas</artifactId>
            <version>${apachePoiOoxmlSchema.version}</version>
        </dependency>
        <dependency>
            <groupId>nl.captcha</groupId>
            <artifactId>simplecaptcha</artifactId>
            <version>1.2.1</version>
            <scope>system</scope>
            <systemPath>${project.basedir}/../libs/simplecaptcha-1.2.1.jar</systemPath>
        </dependency>

        <dependency>
            <groupId>org.thymeleaf.extras</groupId>
            <artifactId>thymeleaf-extras-springsecurity5</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.session</groupId>
            <artifactId>spring-session-data-redis</artifactId>
        </dependency>
        <dependency>
            <groupId>org.liquibase</groupId>
            <artifactId>liquibase-core</artifactId>
            <version>${liquibase.version}</version>
        </dependency>
        <dependency>
            <groupId>com.google.guava</groupId>
            <artifactId>guava</artifactId>
            <version>${guava.version}</version>
        </dependency>

        <dependency>
            <groupId>junit</groupId>
            <artifactId>junit</artifactId>
            <version>4.12</version>
            <scope>test</scope>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
            </plugin>
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-compiler-plugin</artifactId>
                <version>3.1</version>
                <configuration>
                    <source>${java.version}</source>
                    <target>${java.version}</target>
                </configuration>
            </plugin>
        </plugins>
    </build>
</project>
~~~

### `cms\src\main\app.chatflow\package.json`

~~~text
{
  "name": "chat-node-editor",
  "version": "1.0.0",
  "description": "",
  "main": "src/main.js",
  "private": true,
  "scripts": {
    "dev": "webpack-dev-server --inline --progress --config build/webpack.dev.conf.js",
    "start": "node ./yarn-1.22.4.js run dev",
    "unit": "jest --config test/unit/jest.conf.js --coverage",
    "test": "node ./yarn-1.22.4.js run unit",
    "build": "node build/build.js"
  },
  "dependencies": {
    "axios": "^0.19.2",
    "babel-polyfill": "^6.26.0",
    "canvg": "^3.0.6",
    "classlist-polyfill": "^1.2.0",
    "html2canvas": "^1.0.0-rc.7",
    "rete": "1.4.4",
    "rete-area-plugin": "0.1.6",
    "rete-connection-path-plugin": "^0.3.1",
    "rete-connection-plugin": "0.9.0",
    "rete-context-menu-plugin": "0.1.4",
    "rete-history-plugin": "^0.2.1",
    "rete-vue-render-plugin": "0.4.0",
    "rxjs": "6.3.3",
    "sortablejs": "^1.10.2",
    "v-tooltip": "2.0.0-rc.33",
    "vue": "2.6.11",
    "vue-rx": "6.0.1",
    "vue2-ace-editor": "^0.0.15",
    "vuedraggable": "^2.24.0"
  },
  "devDependencies": {
    "autoprefixer": "^7.1.2",
    "babel-core": "^6.22.1",
    "babel-helper-vue-jsx-merge-props": "^2.0.3",
    "babel-jest": "^21.0.2",
    "babel-loader": "^7.1.1",
    "babel-plugin-dynamic-import-node": "^1.2.0",
    "babel-plugin-syntax-jsx": "^6.18.0",
    "babel-plugin-transform-es2015-modules-commonjs": "^6.26.0",
    "babel-plugin-transform-runtime": "^6.22.0",
    "babel-plugin-transform-vue-jsx": "^3.5.0",
    "babel-preset-env": "^1.3.2",
    "babel-preset-stage-2": "^6.22.0",
    "chalk": "^2.0.1",
    "copy-webpack-plugin": "^4.0.1",
    "css-loader": "^0.28.0",
    "extract-text-webpack-plugin": "^3.0.0",
    "file-loader": "^1.1.4",
    "friendly-errors-webpack-plugin": "^1.6.1",
    "html-webpack-plugin": "^2.30.1",
    "jest": "^22.0.4",
    "jest-serializer-vue": "^0.3.0",
    "node-notifier": "^5.1.2",
    "optimize-css-assets-webpack-plugin": "^3.2.0",
    "ora": "^1.2.0",
    "portfinder": "^1.0.13",
    "postcss-import": "^11.0.0",
    "postcss-loader": "^2.0.8",
    "postcss-url": "^7.2.1",
    "rimraf": "^2.6.0",
    "sass-loader": "^7.3.1",
    "semver": "^5.3.0",
    "shelljs": "^0.7.6",
    "uglifyjs-webpack-plugin": "^1.1.1",
    "url-loader": "^0.5.8",
    "vue-jest": "^1.0.2",
    "vue-loader": "^15.7.1",
    "vue-style-loader": "^3.1.1",
    "vue-template-compiler": "^2.6.11",
    "webpack": "^3.6.0",
    "webpack-bundle-analyzer": "^2.9.0",
    "webpack-dev-server": "^2.9.1",
    "webpack-merge": "^4.1.0"
  },
  "engines": {
    "node": ">= 6.0.0",
    "npm": ">= 3.0.0"
  },
  "browserslist": [
    "> 1%",
    "last 2 versions",
    "not ie <= 8"
  ],
  "keywords": []
}
~~~

### `cms\src\main\resources\application-dev.yml`

~~~text
server:
  port: 8280

logging:
  config: classpath:logging-dev-config.xml

spring:
  profiles:
    include: core-dev
  messages:
    basename: i18n/messages
    encoding: UTF-8
  cache:
    jcache:
      config: classpath:ehcache.xml
  ## redis session
  session:
    store-type: redis
  redis:
    cluster:
      nodes: redis1:7000,redis2:7001,redis3:7002
  # file size
  servlet:
    multipart:
      max-request-size: 256MB
      max-file-size: 256MB
#      location: /application/cms/meritz_data/upload_tmp
  main:
    allow-bean-definition-overriding: true
    lazy-initialization: true
  datasource:
    platform: mariadb
    url: jdbc:mariadb://10.92.89.119:13306/meritz_db?characterEncoding=UTF-8&serverTimezone=UTC
    username: vbmardb
    password: <REDACTED>
    driver-class-name: org.mariadb.jdbc.Driver
    type: com.zaxxer.hikari.HikariDataSource
    hikari:
      maximum-pool-size: 15
      minimum-idle: 50
      connection-timeout: 30000
      idle-timeout: 60000
      max-lifetime: 300000

  jpa:
    open-in-view: true
    show-sql: false
    generate-ddl: true
    hibernate:
      ddl-auto: none
    database-platform: org.hibernate.dialect.MariaDB103Dialect

  mvc:
    contentnegotiation:
      favor-parameter: true
      favor-path-extension: true
      midia-types:
        xls: application/vnd.ms-excel
cms:
  rive:
    dir: /application/cms/data/upload/rive
  upload:
    dir: /application/cms/meritz_data/images
  check:
    access:
      remoteIp: false
    captcha: false
  ldap:
    port: 636
    base-dn: OU=Employee,DC=ldap,DC=ktlab,DC=dev
    service:
      id: aicc_ldapdevuser
      password: <REDACTED>
    active: false
    host: https://int-in.api.kt.com/ldap
    version: /v2.0
    key: <REDACTED>
    accounts:
      cp-id: AII3600055158MOSGVX
      cp-pw: SVK3600055158CJIXPR
      connId: ktaicc_ldapuser
      connPwd: <REDACTED>
  # G-Cloud일 경우 회원가입,ip변경 화면 삭제
  sign-up-active: false
  default-pw: Meritz!@34
  api:
    url: http://10.213.177.92
bot:
  content:
    base-path: /application/cms/data/bot
    rive-path: /application/cms/data/bot/rive

script:
  solr:
    backup: ${user.home}/script/solrBackup.sh
engine:
  servers:
    - http://localhost:8180
adapter:
  tb:
    url: http://10.217.69.132
  prod:
    url: https://api.aigw.kt.co.kr

content:
  resourceLocation: http://localhost:8480/images

elasticsearch:
  clustername: meritz-es
  host1: localhost
  host2: localhost
  host3: localhost
  port: 9200
  scheme: http
  index: chatbot_b2b_log*
  server: dev

client:
  simulator-prefix: http://localhost:8480
  simulator-url: /client/STANDBY/simulator.html

batch:
  url: http://localhost:8580/scheduler

header:
  x-auth-key: ZWFzeUNNU19JL0ZfQVBJ
  x-master-auth-key: GHFzeUBQU88JL0ZfLKOVV


sms:
  division: dev

cipher:
  key : <REDACTED>
lamp:
  service-code: CO007701

jasypt:
  encryptor:
    bean: encryptorBean
    pkey: SYgwO1juM

master:
  api:
    url: http://localhost:8380
  check-count: 100

# ===============================
# tts voice
# ===============================
tts:
  url:
    ktp: http://10.92.99.73:6791
    ktc: http://10.92.99.73:6791

# ===============================
# host info
# ===============================
cmshost:
  name: hostname
  ipAddr: 127.0.0.1
  macAddr: 000000000000

###################################################################
#                                                                 #
#                          MULTI TENANCY                          #
#                                                                 #
###################################################################
multitenancy:
  datasource-cache:
    maximumSize: 100
    expireAfterAccess: 10
  tenant:
    repository:
      packages: com.kt.aicc.ktbot.persistence.repositories
    entityManager:
      packages: com.kt.aicc.ktbot.persistence.model
    liquibase:
      enabled: true
      changeLog: classpath:changelog/db.changelog-tenant.yaml
    default-tenant: MASTER
encryption:
  secret: <REDACTED>
  salt: jozo

project:
  name: cms
~~~

### `cms\src\main\resources\application-prod.yml`

~~~text
server:
  port: 8280

logging:
  config: classpath:logging-prod-config.xml

spring:
  profiles:
    include: core-prod
  messages:
    basename: i18n/messages
    encoding: UTF-8
  cache:
    jcache:
      config: classpath:ehcache.xml
  ## redis session
  session:
    store-type: redis
  redis:
    cluster:
      nodes: redis1:7000,redis2:7000,redis3:7000
  # file size
  servlet:
    multipart:
      max-request-size: 256MB
      max-file-size: 256MB
#      location: /application/cms/meritz_data/upload_tmp
  main:
    allow-bean-definition-overriding: true
    lazy-initialization: true
  datasource:
    platform: mariadb
    url: jdbc:mariadb://10.92.20.202:13306/meritz_db?characterEncoding=UTF-8&serverTimezone=UTC
    username: vbmardb
    password: <REDACTED>
    driver-class-name: org.mariadb.jdbc.Driver
    type: com.zaxxer.hikari.HikariDataSource
    hikari:
      maximum-pool-size: 15
      minimum-idle: 50
      connection-timeout: 30000
      idle-timeout: 60000
      max-lifetime: 300000

  jpa:
    open-in-view: true
    show-sql: false
    generate-ddl: true
    hibernate:
    ddl-auto: none
    database-platform: org.hibernate.dialect.MariaDB103Dialect

  mvc:
    contentnegotiation:
      favor-parameter: true
      favor-path-extension: true
      midia-types:
        xls: application/vnd.ms-excel
cms:
  rive:
    dir: /application/cms/data/upload/rive
  upload:
    dir: /application/cms/meritz_data/images
  check:
    access:
      remoteIp: false
    captcha: false
  ldap:
    port: 636
    base-dn: OU=Employee,DC=ldap,DC=ktlab,DC=dev
    service:
      id: aicc_ldapdevuser
      password: <REDACTED>
    active: false
    host: https://int-in.api.kt.com/ldap
    version: /v2.0
    key: <REDACTED>
    accounts:
      cp-id: AII3600055158MOSGVX
      cp-pw: SVK3600055158CJIXPR
      connId: ktaicc_ldapuser
      connPwd: <REDACTED>
  # G-Cloud일 경우 회원가입,ip변경 화면 삭제
  sign-up-active: false
  default-pw: Meritz!@34
  api:
    url: http://10.213.177.92
bot:
  content:
    base-path: /application/cms/data/bot
    rive-path: /application/cms/data/bot/rive

script:
  solr:
    backup: ${user.home}/script/solrBackup.sh
engine:
  servers:
    - http://10.92.30.79:8180
    - http://10.92.30.80:8180
    - http://10.92.30.81:8180
adapter:
  tb:
    url: http://10.217.69.132
  prod:
    url: https://api.aigw.kt.co.kr

content:
  resourceLocation: http://localhost:8480/images

elasticsearch:
  clustername: meritz-es
  host1: es1
  host2: es2
  host3: es3
  port: 9200
  scheme: http
  index: chatbot_b2b_log*
  server: dev

client:
  simulator-prefix: http://10.20.30.243:8480
  simulator-url: /client/STANDBY/simulator.html

batch:
  url: http://10.92.30.79:8580/scheduler

header:
  x-auth-key: ZWFzeUNNU19JL0ZfQVBJ
  x-master-auth-key: GHFzeUBQU88JL0ZfLKOVV


sms:
  division: dev

cipher:
  key : <REDACTED>
lamp:
  service-code: CO007701

jasypt:
  encryptor:
    bean: encryptorBean
    pkey: SYgwO1juM

master:
  api:
    url: http://10.20.30.243:8380
  check-count: 100

# ===============================
# tts voice
# ===============================
tts:
  url:
    ktp: http://10.92.30.83:6791
    ktc: http://10.92.30.83:6791

# ===============================
# host info
# ===============================
cmshost:
  name: hostname
  ipAddr: 127.0.0.1
  macAddr: 000000000000

###################################################################
#                                                                 #
#                          MULTI TENANCY                          #
#                                                                 #
###################################################################
multitenancy:
  datasource-cache:
    maximumSize: 100
    expireAfterAccess: 10
  tenant:
    repository:
      packages: com.kt.aicc.ktbot.persistence.repositories
    entityManager:
      packages: com.kt.aicc.ktbot.persistence.model
    liquibase:
      enabled: true
      changeLog: classpath:changelog/db.changelog-tenant.yaml
    default-tenant: MASTER
encryption:
  secret: <REDACTED>
  salt: jozo

project:
  name: cms
~~~

### `cms\src\main\resources\application-tb.yml`

~~~text
server:
  port: 8280

logging:
  config: classpath:logging-tb-config.xml

spring:
  profiles:
    include: core-tb
  messages:
    basename: i18n/messages
    encoding: UTF-8
  cache:
    jcache:
      config: classpath:ehcache.xml
  ## redis session
  session:
    store-type: redis
  redis:
    cluster:
      nodes: redis1:7000,redis2:7001,redis3:7002
  # file size
  servlet:
    multipart:
      max-request-size: 256MB
      max-file-size: 256MB
  main:
    allow-bean-definition-overriding: true
    lazy-initialization: true
  datasource:
    platform: mariadb
    url: jdbc:mariadb://10.92.89.119:13306/meritz_tb?characterEncoding=UTF-8&serverTimezone=UTC
    username: meritz_tb
    password: <REDACTED>
    driver-class-name: org.mariadb.jdbc.Driver
    type: com.zaxxer.hikari.HikariDataSource
    hikari:
      maximum-pool-size: 15
      minimum-idle: 50
      connection-timeout: 30000
      idle-timeout: 60000
      max-lifetime: 300000

  jpa:
    database: mysql
    open-in-view: true
    show-sql: false
    generate-ddl: true
    hibernate:
      ddl-auto: update

  mvc:
    contentnegotiation:
      favor-parameter: true
      favor-path-extension: true
      midia-types:
        xls: application/vnd.ms-excel
cms:
  rive:
    dir: /application/cms/data/upload/rive
  upload:
    dir: /application/cms/meritz_data/images
  check:
    access:
      remoteIp: false
    captcha: false
  ldap:
    port: 636
    base-dn: OU=Employee,DC=ldap,DC=ktlab,DC=dev
    service:
      id: aicc_ldapdevuser
      password: <REDACTED>
    active: false
    host: https://int-in.api.kt.com/ldap
    version: /v2.0
    key: <REDACTED>
    accounts:
      cp-id: AII3600055158MOSGVX
      cp-pw: SVK3600055158CJIXPR
      connId: ktaicc_ldapuser
      connPwd: <REDACTED>
  # G-Cloud일 경우 회원가입,ip변경 화면 삭제
  sign-up-active: false
  default-pw: Meritz!@34
  api:
    url: http://10.213.177.92
bot:
  content:
    base-path: /application/cms/data/bot
    rive-path: /application/cms/data/bot/rive

script:
  solr:
    backup: ${user.home}/script/solrBackup.sh
engine:
  servers:
    - http://localhost:8180
adapter:
  tb:
    url: http://10.217.69.132
  prod:
    url: https://api.aigw.kt.co.kr

content:
  resourceLocation: http://localhost:8480/images

elasticsearch:
  clustername: meritz-es
  host1: localhost
  host2: localhost
  host3: localhost
  port: 9200
  scheme: http
  index: chatbot_b2b_log*
  server: dev

client:
  simulator-prefix: http://localhost:8480
  simulator-url: /client/STANDBY/simulator.html

batch:
  url: http://localhost:8580/scheduler

header:
  x-auth-key: ZWFzeUNNU19JL0ZfQVBJ
  x-master-auth-key: GHFzeUBQU88JL0ZfLKOVV


sms:
  division: dev

cipher:
  key : <REDACTED>
lamp:
  service-code: CO007701

jasypt:
  encryptor:
    bean: encryptorBean
    pkey: SYgwO1juM

master:
  api:
    url: http://localhost:8380
  check-count: 100

# ===============================
# tts voice
# ===============================
tts:
  url:
    ktp: http://10.92.99.73:6791
    ktc: http://10.92.99.73:6791

# ===============================
# host info
# ===============================
cmshost:
  name: hostname
  ipAddr: 127.0.0.1
  macAddr: 000000000000

###################################################################
#                                                                 #
#                          MULTI TENANCY                          #
#                                                                 #
###################################################################
multitenancy:
  datasource-cache:
    maximumSize: 100
    expireAfterAccess: 10
  tenant:
    repository:
      packages: com.kt.aicc.ktbot.persistence.repositories
    entityManager:
      packages: com.kt.aicc.ktbot.persistence.model
    liquibase:
      enabled: true
      changeLog: classpath:changelog/db.changelog-tenant.yaml
    default-tenant: MASTER
encryption:
  secret: <REDACTED>
  salt: jozo

project:
  name: cms
~~~

### `cms\src\main\resources\application-tc.yml`

~~~text
server:
  port: 8280

logging:
  config: classpath:logging-tc-config.xml

spring:
  profiles:
    include: core-tc
  messages:
    basename: i18n/messages
    encoding: UTF-8
  cache:
    jcache:
      config: classpath:ehcache.xml
  ## redis session
  session:
    store-type: redis
  redis:
    cluster:
      nodes: redis1:7000,redis2:7000,redis3:7000
      # file size
  servlet:
    multipart:
      max-request-size: 256MB
      max-file-size: 256MB
  main:
    allow-bean-definition-overriding: true
    lazy-initialization: false
  datasource:
    platform: mariadb
    url: jdbc:mariadb://mariadb1:13306/meritz_easycms?characterEncoding=UTF-8&serverTimezone=UTC
    username: meritz_easycms
    password: <REDACTED>
    driver-class-name: org.mariadb.jdbc.Driver
    type: com.zaxxer.hikari.HikariDataSource
    hikari:
      maximum-pool-size: 15
      minimum-idle: 50
      connection-timeout: 30000
      idle-timeout: 60000
      max-lifetime: 300000

  jpa:
    database: mysql
    open-in-view: true
    show-sql: true
    generate-ddl: true
    hibernate:
      ddl-auto: update

  mvc:
    contentnegotiation:
      favor-parameter: true
      favor-path-extension: true
      midia-types:
        xls: application/vnd.ms-excel
cms:
  rive:
    dir: /application/cms/data/upload/rive
  upload:
    dir: /application/cms/meritz_data/images
  check:
    access:
      remoteIp: false
    captcha: false
  ldap:
    port: 636
    base-dn: OU=Employee,DC=ldap,DC=ktlab,DC=dev
    service:
      id: aicc_ldapdevuser
      password: <REDACTED>
    active: false
    host: https://int-in.api.kt.com/ldap
    version: /v2.0
    key: <REDACTED>
    accounts:
      cp-id: AII3600055158MOSGVX
      cp-pw: SVK3600055158CJIXPR
      connId: ktaicc_ldapuser
      connPwd: <REDACTED>
  # G-Cloud일 경우 회원가입,ip변경 화면 삭제
  sign-up-active: false
  default-pw: Meritz!@34
  api:
    url: http://10.213.177.92
bot:
  content:
    base-path: /application/cms/data/bot
    rive-path: /application/cms/data/bot/rive

script:
  solr:
    backup: ${user.home}/script/solrBackup.sh
engine:
  servers:
    - http://engine1:8180
    - http://engine2:8180
    - http://engine3:8180
adapter:
  tb:
    url: http://10.217.69.132
  prod:
    url: https://api.aigw.kt.co.kr

content:
  resourceLocation: http://localhost:8480/images

elasticsearch:
  clustername: meritz-es
  host1: es1
  host2: es2
  host3: es3
  port: 9200
  scheme: http
  index: chatbot_b2b_log*
  server: dev

client:
  simulator-prefix: http://localhost:8480
  simulator-url: /client/STANDBY/simulator.html

batch:
  url: http://scheduler1:8580/scheduler

header:
  x-auth-key: ZWFzeUNNU19JL0ZfQVBJ
  x-master-auth-key: GHFzeUBQU88JL0ZfLKOVV


sms:
  division: dev

cipher:
  key : <REDACTED>
lamp:
  service-code: CO007701

jasypt:
  encryptor:
    bean: encryptorBean
    pkey: SYgwO1juM

master:
  api:
    url: http://master:8380
  check-count: 100

# ===============================
# tts voice
# ===============================
tts:
  url:
    ktp: http://10.92.99.73:6791
    ktc: http://10.92.99.73:6791

# ===============================
# host info
# ===============================
cmshost:
  name: hostname
  ipAddr: 127.0.0.1
  macAddr: 000000000000

###################################################################
#                                                                 #
#                          MULTI TENANCY                          #
#                                                                 #
###################################################################
multitenancy:
  datasource-cache:
    maximumSize: 100
    expireAfterAccess: 10
  tenant:
    repository:
      packages: com.kt.aicc.ktbot.persistence.repositories
    entityManager:
      packages: com.kt.aicc.ktbot.persistence.model
    liquibase:
      enabled: true
      changeLog: classpath:changelog/db.changelog-tenant.yaml
    default-tenant: MASTER
encryption:
  secret: <REDACTED>
  salt: jozo

project:
  name: cms
~~~

### `cms\src\main\resources\sh\solrBackup.sh`

~~~text
#!/bin/bash

COLLECTION_NAME=$1
FILE_NAME=$2
curl -o ${FILE_NAME} "http://solr2:8983/solr/${COLLECTION_NAME}/select?q=*:*&fl=DOCID,INTENT,QUESTION_BODY,INTENT_TYPE&wt=csv&rows=1000000000"
~~~

### `common\pom.xml`

~~~text
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <parent>
        <groupId>com.kt.aicc</groupId>
        <version>0.0.1-SNAPSHOT</version>
        <artifactId>ktbot</artifactId>
    </parent>
    <modelVersion>4.0.0</modelVersion>

    <artifactId>common</artifactId>
    <version>0.0.1-SNAPSHOT</version>
    <packaging>jar</packaging>

    <dependencies>
        <dependency>
            <groupId>net.logstash.logback</groupId>
            <artifactId>logstash-logback-encoder</artifactId>
            <version>${logstashLogback.version}</version>
        </dependency>
        <dependency>
            <groupId>commons-io</groupId>
            <artifactId>commons-io</artifactId>
            <version>2.11.0</version>
        </dependency>


        <!-- Jackson XML -->
        <dependency>
            <groupId>com.fasterxml.jackson.core</groupId>
            <artifactId>jackson-core</artifactId>
            <version>${jackson.version}</version>
        </dependency>
        <dependency>
            <groupId>com.fasterxml.jackson.core</groupId>
            <artifactId>jackson-databind</artifactId>
            <version>${jackson.version}</version>
        </dependency>
        <dependency>
            <groupId>com.fasterxml.jackson.dataformat</groupId>
            <artifactId>jackson-dataformat-xml</artifactId>
            <version>${jackson.version}</version>
        </dependency>
        <dependency>
            <groupId>com.fasterxml.jackson.core</groupId>
            <artifactId>jackson-annotations</artifactId>
            <version>${jackson.version}</version>
        </dependency>

<!--        <dependency>
            <groupId>damo</groupId>
            <artifactId>damo-maria</artifactId>
            <version>1.0</version>
            <scope>system</scope>
            <systemPath>${project.basedir}/lib/scpdb.jar</systemPath>
        </dependency>
        <dependency>
            <groupId>db.security.damo</groupId>
            <artifactId>damo</artifactId>
            <version>1.0</version>
        </dependency>
-->
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
                <configuration>
                    <skip>true</skip>
                </configuration>
            </plugin>
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-compiler-plugin</artifactId>
                <version>3.1</version>
                <configuration>
                    <source>${java.version}</source>
                    <target>${java.version}</target>
                </configuration>
            </plugin>
        </plugins>
    </build>
</project>
~~~

### `common\src\main\resources\application-core.yml`

~~~text
# ===============================
# = Redis Property
# ===============================
redis:
  pool:
    max: 50
    min-idle: 15
    max-idle: 25
  hosts: redis1:7000,redis2:7001,redis3:7002
  connection-time-out: 3000
  port: 7000


# ===============================
# Solr Property
# ===============================
solr:
  url: http://solr1:8983/solr
  configSetApi: /admin/configs
  collections: /admin/collections
  zookeeperApi: /zookeeper
  queryApi: /textanalysis
  analysisApi: /analysis/field
  fieldTypeApi: /schema/fieldtypes
  bestMatchesApi: /bestmatches
  nerApi : /tag
  autocompleteApi : /autocomplete
  confirmMatchesApi: /confirmmatches
  intentClassificationMatchesApi: /intentClassificationmatches

  createNodeSetNode1: solr1:8983_solr
  createNodeSetNode2: solr2:8984_solr
  createNodeSetNode3: solr3:8985_solr

  urls: http://solr1:8983/solr,http://solr2:8984/solr,http://solr3:8985/solr
  zk:
    hosts: zk1:2181,zk2:2182,zk3:2183
    timeout: 1000

script:
  solr:
    backup: ${user.home}/script/solrBackup.sh

# ===============================
# Chat Session
# ===============================
chatSession:
  expiredSeconds: 1800
  authExpiredSeconds: 1200

adapter:
  tb:
    url: http://10.217.69.132:8080
    authKey: DKA+zJSSqYGTVtRv1sZn88KQlxI7E2JKV/fgvLScPYo=
  prod:
    url: https://api.aigw.kt.co.kr
    authKey: DKA+zJSSqYGTVtRv1sZn88KQlxI7E2JKV/fgvLScPYo=

cipher:
  key: <REDACTED>

voicebotService:
  tb:
    url: http://10.213.177.156:80/easybot/api/v1
  prod:
    url: http://10.213.177.156:80/easybot/api/v1

adminPortal:
  url: https://admin.kt-aicc.com/staticsticsapi/ezcms

# ===============================
# Xroshot
# ===============================
xroshot:
  apiServer: https://openapis.xroshot.com/V1
  apiKey: A2D5BFCF4C8A7F555A02C85585D1A1B2
  passwd: <REDACTED>
  cdrid: #TODO default 추가해야함
  sendingNumber: 031-712-0927
  botMsg:
    apiKey: A2D5BFCF4C8A7F555A02C85585D1A1B2
    passwd: <REDACTED>

lamp:
  service-code: PG084401
header:
  x-auth-key: ZWFzeUNNU19JL0ZfQVBJ

server-division:
  name: dev
~~~

### `common\src\main\resources\application-core-dev.yml`

~~~text
# ===============================
# = Redis Property
# ===============================
redis:
  pool:
    max: 50
    min-idle: 15
    max-idle: 25
  hosts: redis1:7000,redis2:7001,redis3:7002
  connection-time-out: 3000
  port: 7000


# ===============================
# Solr Property
# ===============================
solr:
  url: http://solr1:8983/solr
  configSetApi: /admin/configs
  collections: /admin/collections
  zookeeperApi: /zookeeper
  queryApi: /textanalysis
  analysisApi: /analysis/field
  fieldTypeApi: /schema/fieldtypes
  bestMatchesApi: /bestmatches
  nerApi : /tag
  autocompleteApi : /autocomplete
  selectApi : /select

  confirmMatchesApi: /confirmmatches
  intentClassificationMatchesApi: /intentClassificationmatches

  createNodeSetNode1: solr1:8983_solr
  createNodeSetNode2: solr2:8984_solr
  createNodeSetNode3: solr3:8985_solr

  urls: http://solr1:8983/solr,http://solr2:8984/solr,http://solr3:8985/solr
  zk:
    hosts: zk1:2181,zk2:2182,zk3:2183
    timeout: 1000

script:
  solr:
    backup: ${user.home}/script/solrBackup.sh

# ===============================
# Chat Session
# ===============================
chatSession:
  expiredSeconds: 1800
  authExpiredSeconds: 1200

adapter:
  tb:
    url: http://10.217.69.132:8080
    authKey: DKA+zJSSqYGTVtRv1sZn88KQlxI7E2JKV/fgvLScPYo=
  prod:
    url: https://api.aigw.kt.co.kr
    authKey: DKA+zJSSqYGTVtRv1sZn88KQlxI7E2JKV/fgvLScPYo=

cipher:
  key: <REDACTED>

voicebotService:
  tb:
    url: http://10.213.177.156:80/easybot/api/v1
  prod:
    url: http://10.213.177.156:80/easybot/api/v1

adminPortal:
  url: https://admin.kt-aicc.com/staticsticsapi/ezcms

# ===============================
# Xroshot
# ===============================
xroshot:
  apiServer: https://openapis.xroshot.com/V1
  apiKey: A2D5BFCF4C8A7F555A02C85585D1A1B2
  passwd: <REDACTED>
  cdrid: #TODO default 추가해야함
  sendingNumber: 031-712-0927
  botMsg:
    apiKey: A2D5BFCF4C8A7F555A02C85585D1A1B2
    passwd: <REDACTED>

lamp:
  service-code: PG084401
header:
  x-auth-key: ZWFzeUNNU19JL0ZfQVBJ

server-division:
  name: dev

# ===============================
# ESB
# =======================
esb:
  serviceId: B
  serviceHost: http://10.92.99.61:25101
  serviceUri: /apis/0/esb/v1/proxy/online
  serverGb: D
  envirInfoDivCd: D
  systemDivCd1: VB
  systemDivCd2: VB
  empNo: S00000052
  empNoIB: S00000054
  empId: ZmZxyQpA52
  empIdIB: ZmZxyQpA54
~~~

### `common\src\main\resources\application-core-local.yml`

~~~text
# ===============================
# = Redis Property
# ===============================
redis:
  pool:
    max: 50
    min-idle: 15
    max-idle: 25
  hosts: localhost
  connection-time-out: 3000
  port: 6379


# ===============================
# Solr Property
# ===============================
solr:
  url: http://solr1:8983/solr
  configSetApi: /admin/configs
  collections: /admin/collections
  zookeeperApi: /zookeeper
  queryApi: /textanalysis
  analysisApi: /analysis/field
  fieldTypeApi: /schema/fieldtypes
  bestMatchesApi: /bestmatches
  nerApi : /tag
  autocompleteApi : /autocomplete
  selectApi : /select

  confirmMatchesApi: /confirmmatches
  intentClassificationMatchesApi: /intentClassificationmatches

  createNodeSetNode1: solr1:8983_solr
  createNodeSetNode2: solr2:8984_solr
  createNodeSetNode3: solr3:8985_solr

  urls: http://solr1:8983/solr,http://solr2:8984/solr,http://solr3:8985/solr
  zk:
    hosts: zk1:2181,zk2:2182,zk3:2183
    timeout: 1000

script:
  solr:
    backup: ${user.home}/script/solrBackup.sh

# ===============================
# Chat Session
# ===============================
chatSession:
  expiredSeconds: 1800
  authExpiredSeconds: 1200

adapter:
  tb:
    url: http://10.217.69.132:8080
    authKey: DKA+zJSSqYGTVtRv1sZn88KQlxI7E2JKV/fgvLScPYo=
  prod:
    url: https://api.aigw.kt.co.kr
    authKey: DKA+zJSSqYGTVtRv1sZn88KQlxI7E2JKV/fgvLScPYo=

cipher:
  key: <REDACTED>

voicebotService:
  tb:
    url: http://10.213.177.156:80/easybot/api/v1
  prod:
    url: http://10.213.177.156:80/easybot/api/v1

adminPortal:
  url: https://admin.kt-aicc.com/staticsticsapi/ezcms

# ===============================
# Xroshot
# ===============================
xroshot:
  apiServer: https://openapis.xroshot.com/V1
  apiKey: A2D5BFCF4C8A7F555A02C85585D1A1B2
  passwd: <REDACTED>
  cdrid: #TODO default 추가해야함
  sendingNumber: 031-712-0927
  botMsg:
    apiKey: A2D5BFCF4C8A7F555A02C85585D1A1B2
    passwd: <REDACTED>

lamp:
  service-code: PG084401
header:
  x-auth-key: ZWFzeUNNU19JL0ZfQVBJ

server-division:
  name: dev

# ===============================
# ESB
# ===============================
esb:
  serviceId: B
  serviceHost: http://10.92.99.61:25101
  serviceUri: /apis/0/esb/v1/proxy/online
  serverGb: D
  envirInfoDivCd: D
  systemDivCd1: VB
  systemDivCd2: VB
  empNo: S00000052
  empNoIB: S00000054
  empId: ZmZxyQpA52
  empIdIB: ZmZxyQpA54
~~~

### `common\src\main\resources\application-core-prod.yml`

~~~text
# ===============================
# = Redis Property
# ===============================
redis:
  pool:
    max: 50
    min-idle: 15
    max-idle: 25
  hosts: redis1:7000,redis2:7000,redis3:7000
  connection-time-out: 3000
  port: 7000


# ===============================
# Solr Property
# ===============================
solr:
  url: http://solr1:8983/solr
  configSetApi: /admin/configs
  collections: /admin/collections
  zookeeperApi: /zookeeper
  queryApi: /textanalysis
  analysisApi: /analysis/field
  fieldTypeApi: /schema/fieldtypes
  bestMatchesApi: /bestmatches
  nerApi : /tag
  autocompleteApi : /autocomplete
  selectApi : /select

  confirmMatchesApi: /confirmmatches
  intentClassificationMatchesApi: /intentClassificationmatches

  createNodeSetNode1: solr1:8983_solr
  createNodeSetNode2: solr2:8983_solr
  createNodeSetNode3: solr3:8983_solr

  urls: http://solr1:8983/solr,http://solr2:8983/solr,http://solr3:8983/solr
  zk:
    hosts: zk1:2181,zk2:2181,zk3:2181
    timeout: 1000

script:
  solr:
    backup: ${user.home}/script/solrBackup.sh

# ===============================
# Chat Session
# ===============================
chatSession:
  expiredSeconds: 1800
  authExpiredSeconds: 1200

adapter:
  tb:
    url: http://10.217.69.132:8080
    authKey: DKA+zJSSqYGTVtRv1sZn88KQlxI7E2JKV/fgvLScPYo=
  prod:
    url: https://api.aigw.kt.co.kr
    authKey: DKA+zJSSqYGTVtRv1sZn88KQlxI7E2JKV/fgvLScPYo=

cipher:
  key: <REDACTED>

voicebotService:
  tb:
    url: http://10.213.177.156:80/easybot/api/v1
  prod:
    url: http://10.213.177.156:80/easybot/api/v1

adminPortal:
  url: https://admin.kt-aicc.com/staticsticsapi/ezcms

# ===============================
# Xroshot
# ===============================
xroshot:
  apiServer: https://openapis.xroshot.com/V1
  apiKey: A2D5BFCF4C8A7F555A02C85585D1A1B2
  passwd: <REDACTED>
  cdrid: #TODO default 추가해야함
  sendingNumber: 031-712-0927
  botMsg:
    apiKey: A2D5BFCF4C8A7F555A02C85585D1A1B2
    passwd: <REDACTED>

lamp:
  service-code: PG084401
header:
  x-auth-key: ZWFzeUNNU19JL0ZfQVBJ

server-division:
  name: dev

# ===============================
# ESB
# ===============================
esb:
  serviceId: B
  serviceHost: http://esbonapi.meritzfire.com
  serviceUri: /apis/0/esb/v1/proxy/online
  serverGb: D
  envirInfoDivCd: P
  systemDivCd1: VB
  systemDivCd2: VB
  empNo: S00000052
  empNoIB: S00000054
  empId: ZmZxyQpA52
  empIdIB: ZmZxyQpA54
~~~

### `common\src\main\resources\application-core-tb.yml`

~~~text
# ===============================
# = Redis Property
# ===============================
redis:
  pool:
    max: 50
    min-idle: 15
    max-idle: 25
  hosts: localhost
  connection-time-out: 3000
  port: 6379


# ===============================
# Solr Property
# ===============================
solr:
  url: http://solr1:8983/solr
  configSetApi: /admin/configs
  collections: /admin/collections
  zookeeperApi: /zookeeper
  queryApi: /textanalysis
  analysisApi: /analysis/field
  fieldTypeApi: /schema/fieldtypes
  bestMatchesApi: /bestmatches
  nerApi : /tag
  autocompleteApi : /autocomplete
  selectApi : /select

  confirmMatchesApi: /confirmmatches
  intentClassificationMatchesApi: /intentClassificationmatches

  createNodeSetNode1: solr1:8983_solr
  createNodeSetNode2: solr2:8984_solr
  createNodeSetNode3: solr3:8985_solr

  urls: http://solr1:8983/solr,http://solr2:8984/solr,http://solr3:8985/solr
  zk:
    hosts: zk1:2181,zk2:2182,zk3:2183
    timeout: 1000

script:
  solr:
    backup: ${user.home}/script/solrBackup.sh

# ===============================
# Chat Session
# ===============================
chatSession:
  expiredSeconds: 1800
  authExpiredSeconds: 1200

adapter:
  tb:
    url: http://10.217.69.132:8080
    authKey: DKA+zJSSqYGTVtRv1sZn88KQlxI7E2JKV/fgvLScPYo=
  prod:
    url: https://api.aigw.kt.co.kr
    authKey: DKA+zJSSqYGTVtRv1sZn88KQlxI7E2JKV/fgvLScPYo=

cipher:
  key: <REDACTED>

voicebotService:
  tb:
    url: http://10.213.177.156:80/easybot/api/v1
  prod:
    url: http://10.213.177.156:80/easybot/api/v1

adminPortal:
  url: https://admin.kt-aicc.com/staticsticsapi/ezcms

# ===============================
# Xroshot
# ===============================
xroshot:
  apiServer: https://openapis.xroshot.com/V1
  apiKey: A2D5BFCF4C8A7F555A02C85585D1A1B2
  passwd: <REDACTED>
  cdrid: #TODO default 추가해야함
  sendingNumber: 031-712-0927
  botMsg:
    apiKey: A2D5BFCF4C8A7F555A02C85585D1A1B2
    passwd: <REDACTED>

lamp:
  service-code: PG084401
header:
  x-auth-key: ZWFzeUNNU19JL0ZfQVBJ

server-division:
  name: dev

# ===============================
# ESB
# ===============================
esb:
  serviceId: B
  serviceHost: http://10.92.99.62:25101
  serviceUri: /apis/0/esb/v1/proxy/online
  serverGb: D
  systemDivCd1: VB
  systemDivCd2: VB
  empNo: S00000052
  empId: ZmZxyQpA52
~~~

### `common\src\main\resources\application-core-tc.yml`

~~~text
# ===============================
# = Redis Property
# ===============================
redis:
  pool:
    max: 50
    min-idle: 15
    max-idle: 25
  hosts: redis1:7000,redis2:7000,redis3:7000
  connection-time-out: 3000
  port: 7000


# ===============================
# Solr Property
# ===============================
solr:
  url: http://solr1:8983/solr
  configSetApi: /admin/configs
  collections: /admin/collections
  zookeeperApi: /zookeeper
  queryApi: /textanalysis
  analysisApi: /analysis/field
  fieldTypeApi: /schema/fieldtypes
  bestMatchesApi: /bestmatches
  nerApi: /tag
  autocompleteApi: /autocomplete
  selectApi: /select

  confirmMatchesApi: /confirmmatches
  intentClassificationMatchesApi: /intentClassificationmatches

  createNodeSetNode1: solr1:8983_solr
  createNodeSetNode2: solr2:8983_solr
  createNodeSetNode3: solr3:8983_solr

  urls: http://solr1:8983/solr,http://solr2:8983/solr,http://solr3:8983/solr
  zk:
    hosts: zk1:2181,zk2:2181,zk3:2181
    timeout: 1000

script:
  solr:
    backup: ${user.home}/script/solrBackup.sh

# ===============================
# Chat Session
# ===============================
chatSession:
  expiredSeconds: 1800
  authExpiredSeconds: 1200

adapter:
  tb:
    url: http://10.217.69.132:8080
    authKey: DKA+zJSSqYGTVtRv1sZn88KQlxI7E2JKV/fgvLScPYo=
  prod:
    url: https://api.aigw.kt.co.kr
    authKey: DKA+zJSSqYGTVtRv1sZn88KQlxI7E2JKV/fgvLScPYo=

cipher:
  key: <REDACTED>

voicebotService:
  tb:
    url: http://10.213.177.156:80/easybot/api/v1
  prod:
    url: http://10.213.177.156:80/easybot/api/v1

adminPortal:
  url: https://admin.kt-aicc.com/staticsticsapi/ezcms

# ===============================
# Xroshot
# ===============================
xroshot:
  apiServer: https://openapis.xroshot.com/V1
  apiKey: A2D5BFCF4C8A7F555A02C85585D1A1B2
  passwd: <REDACTED>
  cdrid: #TODO default 추가해야함
  sendingNumber: 031-712-0927
  botMsg:
    apiKey: A2D5BFCF4C8A7F555A02C85585D1A1B2
    passwd: <REDACTED>

lamp:
  service-code: PG084401
header:
  x-auth-key: ZWFzeUNNU19JL0ZfQVBJ

server-division:
  name: dev

# ===============================
# ESB
# ===============================
esb:
  serviceId: B
  serviceHost: http://10.92.99.61:25101
  serviceUri: /apis/0/esb/v1/proxy/online
  serverGb: D
  envirInfoDivCd: D
  systemDivCd1: VB
  systemDivCd2: VB
  empNo: S00000052
  empNoIB: S00000054
  empId: ZmZxyQpA52
  empIdIB: ZmZxyQpA54
~~~

### `common\src\main\resources-dev\application-core.yml`

~~~text
# ===============================
# = Redis Property
# ===============================
redis:
  pool:
    max: 50
    min-idle: 15
    max-idle: 25
  hosts: redis1:7000,redis2:7001,redis3:7002
  connection-time-out: 3000
  port: 7000


# ===============================
# Solr Property
# ===============================
solr:
  url: http://solr1:8983/solr
  configSetApi: /admin/configs
  collections: /admin/collections
  zookeeperApi: /zookeeper
  queryApi: /textanalysis
  analysisApi: /analysis/field
  fieldTypeApi: /schema/fieldtypes
  bestMatchesApi: /bestmatches
  nerApi : /tag
  autocompleteApi : /autocomplete
  confirmMatchesApi: /confirmmatches
  intentClassificationMatchesApi: /intentClassificationmatches
  selectApi: /select


  createNodeSetNode1: solr1:8983_solr
  createNodeSetNode2: solr2:8984_solr
  createNodeSetNode3: solr3:8985_solr

  urls: http://solr1:8983/solr,http://solr2:8984/solr,http://solr3:8985/solr
  zk:
    hosts: zk1:2181,zk2:2182,zk3:2183
    timeout: 1000

script:
  solr:
    backup: ${user.home}/script/solrBackup.sh

# ===============================
# Chat Session
# ===============================
chatSession:
  expiredSeconds: 1800
  authExpiredSeconds: 1200

adapter:
  tb:
    url: http://10.217.69.132:8080
    authKey: DKA+zJSSqYGTVtRv1sZn88KQlxI7E2JKV/fgvLScPYo=
  prod:
    url: https://api.aigw.kt.co.kr
    authKey: DKA+zJSSqYGTVtRv1sZn88KQlxI7E2JKV/fgvLScPYo=

cipher:
  key: <REDACTED>

voicebotService:
  tb:
    url: http://10.213.177.156:80/easybot/api/v1
  prod:
    url: http://10.213.177.156:80/easybot/api/v1

adminPortal:
  url: https://admin.kt-aicc.com/staticsticsapi/ezcms

# ===============================
# Xroshot
# ===============================
xroshot:
  apiServer: https://openapis.xroshot.com/V1
  apiKey: A2D5BFCF4C8A7F555A02C85585D1A1B2
  passwd: <REDACTED>
  cdrid: #TODO default 추가해야함
  sendingNumber: 031-712-0927
  botMsg:
    apiKey: A2D5BFCF4C8A7F555A02C85585D1A1B2
    passwd: <REDACTED>

lamp:
  service-code: PG084401
header:
  x-auth-key: ZWFzeUNNU19JL0ZfQVBJ

server-division:
  name: dev
~~~

### `common\src\main\resources-local\application-core.yml`

~~~text
# ===============================
# = Redis Property
# ===============================
redis:
  pool:
    max: 50
    min-idle: 15
    max-idle: 25
  hosts: redis1
  connection-time-out: 3000
  port: 5000


# ===============================
# Solr Property
# ===============================
solr:
  url: http://solr1:8983/solr
  configSetApi: /admin/configs
  collections: /admin/collections
  zookeeperApi: /zookeeper
  queryApi: /textanalysis
  analysisApi: /analysis/field
  fieldTypeApi: /schema/fieldtypes
  bestMatchesApi: /bestmatches
  nerApi : /tag
  autocompleteApi : /autocomplete
  selectApi : /select

  createNodeSetNode1: solr1:8983_solr
  createNodeSetNode2: solr2:8984_solr
  createNodeSetNode3: solr3:8985_solr

  confirmMatchesApi: /confirmmatches
  intentClassificationMatchesApi: /intentClassificationmatches
  urls: http://solr1:8983/solr,http://solr2:8983/solr,http://solr3:8985/solr
  zk:
    hosts: zk1:2181,zk2:2182,zk3:2183
    timeout: 1000

script:
  solr:
    backup: ${user.home}/script/solrBackup.sh

# ===============================
# Chat Session
# ===============================
chatSession:
  expiredSeconds: 1800
  authExpiredSeconds: 1200

# ===============================
# adaptor info
# ===============================
adapter:
  tb:
    url: http://10.217.69.132:8080
    authKey: DKA+zJSSqYGTVtRv1sZn88KQlxI7E2JKV/fgvLScPYo=
  prod:
    url: http://10.217.69.132:8080
    authKey: DKA+zJSSqYGTVtRv1sZn88KQlxI7E2JKV/fgvLScPYo=

voicebotService:
  tb:
    url: http://localhost:8080
  prod:
    url: http://localhost:8080

cipher:
  key: <REDACTED>

adminPortal:
  url: http://10.213.176.223:8080/staticsticsapi/ezcms

# ===============================
# Xroshot
# ===============================
xroshot:
  apiServer: https://openapi2.xroshot.com/V1
  apiKey: E91FD1114741D83CC0F40ECB4F1E9FD0
  passwd: <REDACTED>
  cdrid: #TODO default 추가해야함
  sendingNumber: 010-9777-8277
  botMsg:
    apiKey: A2D5BFCF4C8A7F555A02C85585D1A1B2
    passwd: <REDACTED>

lamp:
  service-code: CO007701
header:
  x-auth-key: ZWFzeUNNU19JL0ZfQVBJ
~~~

### `common\src\main\resources-prod\application-core.yml`

~~~text
# ===============================
# = Redis Property
# ===============================
redis:
  pool:
    max: 50
    min-idle: 15
    max-idle: 25
  hosts: redis1:7000,redis2:7001,redis3:7002
  connection-time-out: 3000
  port: 7000


# ===============================
# Solr Property
# ===============================
solr:
  url: http://solr1:8983/solr
  configSetApi: /admin/configs
  collections: /admin/collections
  zookeeperApi: /zookeeper
  queryApi: /textanalysis
  analysisApi: /analysis/field
  fieldTypeApi: /schema/fieldtypes
  bestMatchesApi: /bestmatches
  nerApi : /tag
  autocompleteApi : /autocomplete
  confirmMatchesApi: /confirmmatches
  intentClassificationMatchesApi: /intentClassificationmatches
  selectApi : /select

  createNodeSetNode1: solr1:8983_solr
  createNodeSetNode2: solr2:8984_solr
  createNodeSetNode3: solr3:8985_solr

  urls: http://solr1:8983/solr,http://solr2:8984/solr,http://solr3:8985/solr
  zk:
    hosts: zk1:2181,zk2:2182,zk3:2183
    timeout: 1000

script:
  solr:
    backup: ${user.home}/script/solrBackup.sh

# ===============================
# Chat Session
# ===============================
chatSession:
  expiredSeconds: 1800
  authExpiredSeconds: 1200

adapter:
  tb:
    url: http://10.217.69.132:8080
    authKey: DKA+zJSSqYGTVtRv1sZn88KQlxI7E2JKV/fgvLScPYo=
  prod:
    url: https://api.aigw.kt.co.kr
    authKey: DKA+zJSSqYGTVtRv1sZn88KQlxI7E2JKV/fgvLScPYo=

cipher:
  key: <REDACTED>

voicebotService:
  tb:
    url: http://10.213.177.156:80/easybot/api/v1
  prod:
    url: http://10.213.177.156:80/easybot/api/v1

adminPortal:
  url: https://admin.kt-aicc.com/staticsticsapi/ezcms

# ===============================
# Xroshot
# ===============================
xroshot:
  apiServer: https://openapis.xroshot.com/V1
  apiKey: A2D5BFCF4C8A7F555A02C85585D1A1B2
  passwd: <REDACTED>
  cdrid: #TODO default 추가해야함
  sendingNumber: 031-712-0927
  botMsg:
    apiKey: A2D5BFCF4C8A7F555A02C85585D1A1B2
    passwd: <REDACTED>

lamp:
  service-code: PG084401
header:
  x-auth-key: ZWFzeUNNU19JL0ZfQVBJ

server-division:
  name: prod
~~~

### `docs\99.ETC\aicc_chatbot_deploy_manual.md`

~~~text
# KT EasyCms EPC Deploy Manual

### Revision History
Version | Issue                                     | Author        | Updated
:------:|:------------------------------------------|:-------------:|:-----------:
 v1.0.0 | 초안 작성                                   | 송시욱         | 2021-05-27

### Server 정보
서버명                 | 장비용도      | OS        | CPU   | Memory    | Disk  | IP Address        | Software  | Application
:--------------------:|:-------------|:---------|:-----:|:----------|:-------|:----------------:|:----------|:----------------
L4                    | Web L4       |           |       |          |         |  10.213.177.159  |           |
prd-escweb01          | Web          | CentOS 7.6 | 4    | 8G        |        | 10.213.177.147   | nginx     |
prd-escweb01          | Web          | CentOS 7.6 | 4    | 8G        |        | 10.213.177.148   | nginx     |
prd-esvcv01           | 채널 GW AP    | CentOS 7.6 | 8    | 16G       |        | 10.213.177.73     | nginx<br>wildfly<br>logstash| Chat UI<br>채널 G/W
prd-esvcv02           | 채널 GW AP    | CentOS 7.6 | 8    | 16G       |        | 10.213.177.74     | nginx<br>wildfly<br>logstash| Chat UI<br>채널 G/W
Engine L4                | Engine L4    |           |       |           |        | 10.213.177.91   |           |
prd-escsvc03          | Engine AP    | CentOS 7.6 |  8   | 16G       |        | 10.213.177.75   | nginx<br>wildfly<br>logstash| Easy CMS Engine
prd-escsvc04          | Engine AP    | CentOS 7.6 |  8   | 16G       |        | 10.213.177.76   | nginx<br>wildfly<br>logstash| Easy CMS Engine
CMS L4                   | CMS L4       |           |        |           |        | 10.213.177.92   |           |
prd-escsv05           | CMS          | CentOS 7.6 | 8    | 16G       |        | 10.213.177.48     | nginx<br>wildfly| Easy CMS
prd-escsv06           | CMS          | CentOS 7.6 | 8    | 16G       |        | 10.213.177.49     | nginx<br>wildfly| Easy CMS
DB VIP                   | DB VIP       |           |        |          |        |                   |           |
prd-escdb01           | DB           | CentOS 7.6| 8     | 16G       |        | 10.213.177.68     | postgres 11|
prd-escdb02           | DB           | CentOS 7.6| 8     | 16G       |        | 10.213.177.69     | postgres 11|
prd-escredis01        | redis1<br>solr1<br>es1 | CentOS 7.6 | 8 |32G |        | 10.213.177.70     | redis<br>solr<br>Elasticsearch<br>zookeeper     |
prd-escredis02        | redis2<br>solr2<br>es2 | CentOS 7.6 | 8 |32G |        | 10.213.177.71    | redis<br>solr<br>Elasticsearch<br>zookeeper      |
prd-escredis03        | redis3<br>solr3<br>es3 | CentOS 7.6 | 8 |32G |        | 10.213.177.72    | redis<br>solr<br>Elasticsearch<br>zookeeper      |

<a id="check_list"></a>

### 1. 배포 전(TB)/후(PRD) 체크리스트
#### 1.1. G/W, Chat UI, Engine

* 배포테스트봇 시뮬레이터를 이용하여 배포테스트대화 진행 및 G/W 로그 정상 확인


#### 1.2. CMS
항목              | 상세                                                | 비고
:---------------:|:----------------------------------------------------|:-----------
로그인             | CMS 로그인 성공 확인  |
채널 관리             | 채널 목록 및 상세화면 조회   |
대화 관리            | 의도 목록 및 상세화면 조회 / Excel Download 정상 확인  |
파라미터 관리        | 파라미터 목록 및 상세 조회 / Excel Download 정상 확인 |
검증 관리        | 검증 관리 질문내용 검색 결과 및 형태소 분석 검색 후 Solr와 일치하는지 확인 |
어댑터API 관리   | 어댑터 API 관리 및 상세화면 조회 |
개체명 관리     | 개체명 목록, 상세화면 및 개체 항목 조회 / Excel Download 정상 확인 |
컨펌 개체명 관리  | 컨펌 개체명 목록 및 상세 조회 / Excel Download 정상 확인 |
동의어 관리        | 동의어 목록 및 상세 조회 / Excel Download 정상 확인 |
오타 관리          | 오타 목록 및 상세 조회 / Excel Download 정상 확인 |
불용어 관리        | 불용어 목록 및 상세 조회 / Excel Download 정상 확인 |
사용자 사전 관리     | 사용자 사전 관리 목록 및 상세 조회 / Excel Download 정상 확인 |
채팅 로그 | 채팅 로그 조회, 대화 보기로 상세 진입 후 내용 확인 |
학습 로그 | 학습 후 학습 로그 조회 |
배포 로그 | 배포 후 배포 로그 조회 |
대화 로그 | 의도 저작도구 수정 및 등록 후 대화 로그 목록 조회 및 상세내용 확인 |
의도 로그 | 의도 수정 및 등록 후 목록 조회 및 상세화면에서 예문 변경 확인|
배치 로그 | 배치 로그 목록 조회 |
봇 만족도 로그 | 봇 만족도 로그 목록 조회 |
대화 만족도 로그 | 대화 만족도 로그 조회, 기타의견 존재 시 상세 진입 후 내용 확인 |
미답변 로그 | 미답변 로그 목록 조회 / Excel Download 정상 확인 |
접속자수 통계 | 검색 구분별로 조회 / 검색 결과 Excel Download 및 검색지능화 Excel Download 정상 확인 |
대화 통계 | 검색 구분별로 조회 / Excel Download 정상 확인 |
지식 현황 | 검색 구분별로 조회 / Excel Download 정상 확인 |
Top10 현황 | 검색 구분별로 조회 / Top100 및 전체 Excel Download 정상 확인 |
만족도 조사 통계 | 검색 구분별로 조회 / Excel Download 정상 확인 |
사용자 관리 | 사용자 목록 조회 및 상세 조회 |
권한 관리 | 권한 목록 조회 및 상세 조회 |
봇 카테고리 관리 | 봇 카테고리 목록 조회 및 상세 조회 |
고객사 관리 | 고객사 목록 조회 및 상세 조회 |
코드 관리 | 코드 목록 조회 및 상세 조회 |
학습추천 | 학습 추천 목록 조회 / Excel Download 정상 확인 |

#### 1.3. Scheduler
항목              | 상세                                                | 비고
:---------------:|:----------------------------------------------------|:-----------
RCS 토큰 갱신      |prd-escsvc05 서버의 ecms_cms12 인스턴스의 RCS_CREATE_TOKEN 로그 확인 |
예약 배포          |prd-escsvc05 서버의 ecms_cms12 인스턴스의 RESERVE_DEPLOY_JOB 로그 확인 |
학습 추천          |prd-escsvc05 서버의 ecms_cms12 인스턴스의 LEARN_RECOMMEND_JOB 로그 확인 |
접속자수 통계       |prd-escsvc05 서버의 ecms_cms12 인스턴스의 USER_STATISTIC 로그 확인 |
대화 통계          |prd-escsvc05 서버의 ecms_cms12 인스턴스의 DIALOG_STATISTIC 로그 확인 |
만족도 조사 통계    |prd-escsvc05 서버의 ecms_cms12 인스턴스의 SATISFACTION_STATISTIC 로그 확인 |
지식 현황 통계      |prd-escsvc05 서버의 ecms_cms12 인스턴스의 KNOWLEDGE_STATISTIC 로그 확인 |
Top 10대화 통계    |prd-escsvc05 서버의 ecms_cms12 인스턴스의 TOP10_DIALOG_STATISTIC 로그 확인 |


### 2. 배포절차
#### 2.1. G/W
 - prd-esvcv01 인스턴스 : ecms_gw11, ecms_gw12
 - prd-esvcv02 인스턴스 : ecms_gw21, ecms_gw22

##### 2.1.1. G/W 빌드
 1. Terminal 화면에서 Easy Cms Project 폴더로 이동
 2. gradle -p ./**_gateway_** clean build -x test -Pprofile=**_prod_**  명령어 실행
 3. Easy Cms Project 폴더 > gateway > build > libs > _gateway-SNAPSHOT.war_ 파일 생성 확인
 4. _gateway-SNAPSHOT.war_ 파일을 _ROOT.war_현재날짜_생성횟수_  로 파일명 변경 _ex) ROOT.war_20210527_1_

##### 2.1.2. G/W 배포
 1. G/W AP01 SFTP jboss 접속
 2. 빌드한 파일을 /jboss/applications/ 경로로 업로드
 3. applications/ecms_gw11 인스턴스 폴더로 빌드한 파일 복사
 4. domains/ecms_gw11 인스턴스 셧다운(stop 또는 kill)
 5. 기존 _ROOT.war_ 파일을 _ROOT.war_backup_현재날짜_ 로 변경
 6. 복사된 새로 빌드한 파일을 _ROOT.war_ 로 변경
 7.  domains/ecms_gw11 인스턴스 부팅(start)

 * WAS 정상 기동여부를 확인 한다.
 * WAS 비정상 기동 시 <a href="#back">원복</a> 진행.
 * WAS 정상 기동 시 나머지 인스턴스 셧다운 후 <a href="#test">테스트</a> 진행
 * 테스트 통과 시 나머지 인스턴스 모두 배포 후 다시 테스트 진행


#### 2.2. Chat UI
 - prd-esvcv01 인스턴스 : ecms_gw13, ecms_gw14
 - prd-esvcv02 인스턴스 : ecms_gw24, ecms_gw24

##### 2.2.1. Chat UI 빌드
 1. Terminal 화면에서 Easy Cms Project 폴더로 이동
 2. gradle -p ./**_chat-ui_** clean build -x test -Pprofile=**_prod_**  명령어 실행
 3. Easy Cms Project 폴더 > chat-ui > build > libs > _client-SNAPSHOT.war_ 파일 생성 확인
 4. _chat-ui-SNAPSHOT.war_ 파일을 _client.war_현재날짜_생성횟수_  로 파일명 변경 _ex) client.war_20210527_1_

##### 2.2.2. Chat UI 배포
 1. G/W AP01 SFTP jboss 접속
 2. 빌드한 파일을 /jboss/applications/ 경로로 업로드
 3. applications/ecms_gw13 인스턴스 폴더로 빌드한 파일 복사
 4. domains/ecms_gw13 인스턴스 셧다운(stop 또는 kill)
 5. 기존 _client.war_ 파일을 _client.war_backup_현재날짜_ 로 변경
 6. 복사된 새로 빌드한 파일을 _client.war_ 로 변경
 7.  domains/ecms_gw13 인스턴스 부팅(start)

 * WAS 정상 기동여부를 확인 한다.
 * WAS 비정상 기동 시 <a href="#cu_back">원복</a> 진행.
 * WAS 정상 기동 시 나머지 인스턴스 셧다운 후 <a href="#cu_test">테스트</a> 진행
 * 테스트 통과 시 나머지 인스턴스 모두 배포 후 Clustering 확인을 위해 다시 테스트 진행


#### 2.3. Engine
 - prd-esvcv03 인스턴스 : ecms_ap11, ecms_ap12
 - prd-esvcv04 인스턴스 : ecms_ap21, ecms_ap22

##### 2.3.1. Engine 빌드
 1. Terminal 화면에서 Easy Cms Project 폴더로 이동
 2. gradle -p ./**_engine_** clean build -x test -Pprofile=**_prod_**  명령어 실행
 3. Easy Cms Project 폴더 > engine > build > libs > _engine-SNAPSHOT.war_ 파일 생성 확인
 4. _engine-SNAPSHOT.war_ 파일을 _ROOT.war_현재날짜_생성횟수_  로 파일명 변경 _ex) ROOT.war_20210527_1_

##### 2.3.2. Engine 배포
 1. Engine AP01 SFTP jboss 접속
 2. 빌드한 파일을 /jboss/applications/ 경로로 업로드
 3. applications/ecms_ap11 인스턴스 폴더로 빌드한 파일 복사
 4. domains/ecms_ap11 인스턴스 셧다운(stop 또는 kill)
 5. 기존 _ROOT.war_ 파일을 _ROOT.war_backup_현재날짜_ 로 변경
 6. 복사된 새로 빌드한 파일명을 _ROOT.war_ 로 변경
 7. domains/ecms_ap11 인스턴스 부팅(start)

 * WAS 정상 기동여부를 확인 한다.
 * WAS 비정상 기동 시 <a href="#back">원복</a> 진행.
 * WAS 정상 기동 시 나머지 인스턴스 셧다운 후 <a href="#test">테스트</a> 진행
 * 테스트 통과 시 나머지 인스턴스 모두 배포 후 Clustering 확인을 위해 다시 <a href="#test">테스트</a> 진행


#### 2.4. CMS
 - prd-esvcv05 인스턴스 : ecms_cms11
 - prd-esvcv06 인스턴스 : ecms_cms21

##### 2.4.1. CMS 빌드
 1. Terminal 화면에서 Easy Cms Project 폴더로 이동
 2. gradle -p ./**_cms_** clean build -x test -Pprofile=**_prod_**  명령어 실행
 3. Easy Cms Project 폴더 > cms > build > libs > _cms-SNAPSHOT.war_ 파일 생성 확인
 4. _cms-SNAPSHOT.war_ 파일을 _ROOT.war_현재날짜_생성횟수_  로 파일명 변경 _ex) ROOT.war_20210527_1_

##### 2.4.2. CMS 배포
 1. CMS AP01 SFTP jboss 접속
 2. 빌드한 파일을 /jboss/applications/ 경로로 업로드
 3. applications/ecms_cms11 인스턴스 폴더로 빌드한 파일 복사
 4. domains/ecms_cms11 인스턴스 셧다운(stop 또는 kill)
 5. 기존 _ROOT.war_ 파일을 _ROOT.war_backup_현재날짜_ 로 변경
 6. 복사된 새로 빌드한 파일명을 _ROOT.war_ 로 변경
 7. domains/ecms_cms11 인스턴스 부팅(start)

 * WAS 정상 기동여부를 확인 한다.
 * WAS 비정상 기동 시 <a href="#back">원복</a> 진행.
 * WAS 정상 기동 시 나머지 인스턴스 셧다운 후 <a href="#test">테스트</a>> 진행
 * 테스트 통과 시 나머지 인스턴스 모두 배포 후 Clustering 확인을 위해 다시 <a href="#test">테스트</a> 진행




#### 2.5. Scheduler
 - prd-esvcv05 인스턴스 : ecms_cms12

##### 2.5.1. Scheduler 빌드
 1. Terminal 화면에서 Easy Cms Project 폴더로 이동
 2. gradle -p ./**_scheduler_** clean build -x test -Pprofile=**_prod_**  명령어 실행
 3. Easy Cms Project 폴더 > scheduler > build > libs > _scheduler-SNAPSHOT.war_ 파일 생성 확인
 4. _scheduler-SNAPSHOT.war_ 파일을 _ROOT.war_현재날짜_생성횟수_  로 파일명 변경 _ex) ROOT.war_20210527_1_

##### 2.5.2. Scheduler 배포
 1. CMS AP01 SFTP jboss 접속
 2. 빌드한 파일을 /jboss/applications/ 경로로 업로드
 3. applications/ecms_cms12 인스턴스 폴더로 빌드한 파일 복사
 4. domains/ecms_cms12 인스턴스 셧다운(stop 또는 kill)
 5. 기존 _ROOT.war_ 파일을 _ROOT.war_backup_현재날짜_ 로 변경
 6. 복사된 새로 빌드한 파일명을 _ROOT.war_ 로 변경
 7. domains/ecms_cms12 인스턴스 부팅(start)

 * WAS 정상 기동여부를 확인 한다.
 * WAS 비정상 기동 시 <a href="#back">원복</a> 진행.
 * ~~WAS 정상 기동 시 나머지 인스턴스 셧다운 후 <a href="#test">테스트</a>> 진행~~




<a id="test"></a>
##### 테스트
* https://escms.kt-aicc.com/ 에서 테스트 진행
* <a href="#check_list">1. 체크리스트</a> 에서 배포 진행한 항목을 테스트한다.
* 테스트 결과 통과하지 못했을 경우 원복을 진행한다.

<a id="back"></a>
##### 원복
* 인스턴스 셧다운
* SFTP에서 새로 적용한 war파일을 삭제
* 백업 해놓은 war파일의 파일명을 원복 후 부팅
* <a href="#check_list">1. 체크리스트</a> 항목 테스트하여 정상 원복 확인

~~~

### `docs\99.ETC\b2b_aicc_easycms_deploy_manual.md`

~~~text
# KT EasyCms EPC Deploy Manual

### Revision History
Version | Issue                                     | Author        | Updated
:------:|:------------------------------------------|:-------------:|:-----------:
v1.0.0 | 초안 작성                                   | 송시욱         | 2021-05-27
v1.0.1 | B2B 버전 작성 (전북대 기준)                   | 이형수         | 2021-10-25

### Server 정보
서버명    | 장비용도      | OS          | CPU                                | Memory  | Disk      | IP Address        | Software  | Application
:------:|:-------------|:------------|:----------------------------------:|:--------|:----------|:-----------------:|:----------|:----------------
DB      | Web, AP      | CentOS 7.6  | 인텔 제온 골드 6226 12C/24T 2.7G x 2  | 256G   | 600GB x 2 | 203.254.128.227   | postgres 11<br>redis<br>solr<br>zookeeper          |
대화엔진  | DB, 검색엔진  | CentOS 7.6  | 인텔 제온 골드 5222 4C/8T 3.8G x 2    | 64G    | 600GB x 2 | 203.254.128.229   | nginx<br>wildfly<br>logstach<br>elasticsearch<br>kibana | EasyCMS

<a id="check_list"></a>

### 1. 배포 전(TB)/후(PRD) 체크리스트
#### 1.1. G/W, Chat UI, Engine

* 배포테스트봇 시뮬레이터를 이용하여 배포테스트대화 진행 및 G/W 로그 정상 확인


#### 1.2. CMS
항목              | 상세                                                | 비고
:---------------:|:----------------------------------------------------|:-----------
로그인             | CMS 로그인 성공 확인  |
채널 관리             | 채널 목록 및 상세화면 조회   |
대화 관리            | 의도 목록 및 상세화면 조회 / Excel Download 정상 확인  |
파라미터 관리        | 파라미터 목록 및 상세 조회 / Excel Download 정상 확인 |
검증 관리        | 검증 관리 질문내용 검색 결과 및 형태소 분석 검색 후 Solr와 일치하는지 확인 |
어댑터API 관리   | 어댑터 API 관리 및 상세화면 조회 |
개체명 관리     | 개체명 목록, 상세화면 및 개체 항목 조회 / Excel Download 정상 확인 |
컨펌 개체명 관리  | 컨펌 개체명 목록 및 상세 조회 / Excel Download 정상 확인 |
동의어 관리        | 동의어 목록 및 상세 조회 / Excel Download 정상 확인 |
오타 관리          | 오타 목록 및 상세 조회 / Excel Download 정상 확인 |
불용어 관리        | 불용어 목록 및 상세 조회 / Excel Download 정상 확인 |
사용자 사전 관리     | 사용자 사전 관리 목록 및 상세 조회 / Excel Download 정상 확인 |
채팅 로그 | 채팅 로그 조회, 대화 보기로 상세 진입 후 내용 확인 |
학습 로그 | 학습 후 학습 로그 조회 |
배포 로그 | 배포 후 배포 로그 조회 |
대화 로그 | 의도 저작도구 수정 및 등록 후 대화 로그 목록 조회 및 상세내용 확인 |
의도 로그 | 의도 수정 및 등록 후 목록 조회 및 상세화면에서 예문 변경 확인|
배치 로그 | 배치 로그 목록 조회 |
봇 만족도 로그 | 봇 만족도 로그 목록 조회 |
대화 만족도 로그 | 대화 만족도 로그 조회, 기타의견 존재 시 상세 진입 후 내용 확인 |
미답변 로그 | 미답변 로그 목록 조회 / Excel Download 정상 확인 |
접속자수 통계 | 검색 구분별로 조회 / 검색 결과 Excel Download 및 검색지능화 Excel Download 정상 확인 |
대화 통계 | 검색 구분별로 조회 / Excel Download 정상 확인 |
지식 현황 | 검색 구분별로 조회 / Excel Download 정상 확인 |
Top10 현황 | 검색 구분별로 조회 / Top100 및 전체 Excel Download 정상 확인 |
만족도 조사 통계 | 검색 구분별로 조회 / Excel Download 정상 확인 |
사용자 관리 | 사용자 목록 조회 및 상세 조회 |
권한 관리 | 권한 목록 조회 및 상세 조회 |
봇 카테고리 관리 | 봇 카테고리 목록 조회 및 상세 조회 |
고객사 관리 | 고객사 목록 조회 및 상세 조회 |
코드 관리 | 코드 목록 조회 및 상세 조회 |
학습추천 | 학습 추천 목록 조회 / Excel Download 정상 확인 |

#### 1.3. Scheduler
항목              | 상세                                                | 비고
:---------------:|:----------------------------------------------------|:-----------
RCS 토큰 갱신      |대화엔진 서버 ecms_batch 인스턴스의 RCS_CREATE_TOKEN 로그 확인 |
예약 배포          |대화엔진 서버 ecms_batch 인스턴스의 RESERVE_DEPLOY_JOB 로그 확인 |
학습 추천          |대화엔진 서버 ecms_batch 인스턴스의 LEARN_RECOMMEND_JOB 로그 확인 |
접속자수 통계       |대화엔진 서버 ecms_batch 인스턴스의 USER_STATISTIC 로그 확인 |
대화 통계          |대화엔진 서버 ecms_batch 인스턴스의 DIALOG_STATISTIC 로그 확인 |
만족도 조사 통계    |대화엔진 서버 ecms_batch 인스턴스의 SATISFACTION_STATISTIC 로그 확인 |
지식 현황 통계      |대화엔진 서버 ecms_batch 인스턴스의 KNOWLEDGE_STATISTIC 로그 확인 |
Top 10대화 통계    |대화엔진 서버 ecms_batch 인스턴스의 TOP10_DIALOG_STATISTIC 로그 확인 |


### 2. 배포절차
#### 2.1. G/W
 - 대화엔진 인스턴스 : ecms_gw

##### 2.1.1. G/W 빌드
 1. Terminal 화면에서 Easy Cms Project 디렉토리로 이동
 2. gradle -p ./**_gateway_** clean build -x test -Pprofile=**_b2b_**  명령어 실행
 3. Easy Cms Project 폴더 > gateway > build > libs > _gateway-SNAPSHOT.war_ 파일 생성 확인
 4. _gateway-SNAPSHOT.war_ 파일을 _ROOT.war_현재날짜_생성횟수_  로 파일명 변경 _ex) ROOT.war_20210527_1_

##### 2.1.2. G/W 배포
 1. 대화엔진 SFTP jboss 접속
 2. 빌드한 파일을 /jboss/applications/ 경로로 업로드
 3. /jboss/applications/ecms_gw 인스턴스 폴더로 빌드한 파일 복사
 4. /jboss/domains/ecms_gw 인스턴스 셧다운(stop 또는 kill)
 5. 기존 _ROOT.war_ 파일을 _ROOT.war_backup_현재날짜_ 로 변경
 6. 복사된 새로 빌드한 파일을 _ROOT.war_ 로 변경
 7. /jboss/domains/ecms_gw 인스턴스 부팅(start)

 * WAS 정상 기동여부를 확인 한다.
 * WAS 비정상 기동 시 <a href="#back">원복</a> 진행.
 * WAS 정상 기동 시 <a href="#test">테스트</a> 진행


#### 2.2. Chat UI
 - 대화엔진 인스턴스 : ecms_chatui

##### 2.2.1. Chat UI 빌드
 1. Terminal 화면에서 Easy Cms Project 폴더로 이동
 2. gradle -p ./**_chat-ui_** clean build -x test -Pprofile=**_b2b_**  명령어 실행
 3. Easy Cms Project 폴더 > chat-ui > build > libs > _client-SNAPSHOT.war_ 파일 생성 확인
 4. _chat-ui-SNAPSHOT.war_ 파일을 _client.war_현재날짜_생성횟수_  로 파일명 변경 _ex) client.war_20210527_1_

##### 2.2.2. Chat UI 배포
 1. 대화엔진 SFTP jboss 접속
 2. 빌드한 파일을 /jboss/applications/ 경로로 업로드
 3. /jboss/applications/ecms_chatui 인스턴스 폴더로 빌드한 파일 복사
 4. /jboss/domains/ecms_chatui 인스턴스 셧다운(stop 또는 kill)
 5. 기존 _client.war_ 파일을 _client.war_backup_현재날짜_ 로 변경
 6. 복사된 새로 빌드한 파일을 _client.war_ 로 변경
 7. /jboss/domains/ecms_chatui 인스턴스 부팅(start)

 * WAS 정상 기동여부를 확인 한다.
 * WAS 비정상 기동 시 <a href="#cu_back">원복</a> 진행.
 * WAS 정상 기동 시 <a href="#cu_test">테스트</a> 진행


#### 2.3. Engine
 - 대화엔진 인스턴스 : ecms_ap

##### 2.3.1. Engine 빌드
 1. Terminal 화면에서 Easy Cms Project 폴더로 이동
 2. gradle -p ./**_engine_** clean build -x test -Pprofile=**_b2b_**  명령어 실행
 3. Easy Cms Project 폴더 > engine > build > libs > _engine-SNAPSHOT.war_ 파일 생성 확인
 4. _engine-SNAPSHOT.war_ 파일을 _ROOT.war_현재날짜_생성횟수_  로 파일명 변경 _ex) ROOT.war_20210527_1_

##### 2.3.2. Engine 배포
 1. 대화엔진 SFTP jboss 접속
 2. 빌드한 파일을 /jboss/applications/ 경로로 업로드
 3. /jboss/applications/ecms_ap 인스턴스 폴더로 빌드한 파일 복사
 4. /jboss/domains/ecms_ap 인스턴스 셧다운(stop 또는 kill)
 5. 기존 _ROOT.war_ 파일을 _ROOT.war_backup_현재날짜_ 로 변경
 6. 복사된 새로 빌드한 파일명을 _ROOT.war_ 로 변경
 7. /jboss/domains/ecms_ap 인스턴스 부팅(start)

 * WAS 정상 기동여부를 확인 한다.
 * WAS 비정상 기동 시 <a href="#back">원복</a> 진행.
 * WAS 정상 기동 시 <a href="#test">테스트</a> 진행

#### 2.4. Master
- 대화엔진 인스턴스 : ecms_mst

##### 2.4.1. Master 빌드
1. Terminal 화면에서 Easy Cms Project 폴더로 이동
2. gradle -p ./**_engine_** clean build -x test -Pprofile=**_b2b_**  명령어 실행
3. Easy Cms Project 폴더 > engine > build > libs > _engine-SNAPSHOT.war_ 파일 생성 확인
4. _engine-SNAPSHOT.war_ 파일을 _ROOT.war_현재날짜_생성횟수_  로 파일명 변경 _ex) ROOT.war_20210527_1_

##### 2.4.2. Master 배포
1. 대화엔진 SFTP jboss 접속
2. 빌드한 파일을 /jboss/applications/ 경로로 업로드
3. /jboss/applications/ecms_mst 인스턴스 폴더로 빌드한 파일 복사
4. /jboss/domains/ecms_mst 인스턴스 셧다운(stop 또는 kill)
5. 기존 _ROOT.war_ 파일을 _ROOT.war_backup_현재날짜_ 로 변경
6. 복사된 새로 빌드한 파일명을 _ROOT.war_ 로 변경
7. /jboss/domains/ecms_mst 인스턴스 부팅(start)

* WAS 정상 기동여부를 확인 한다.
* WAS 비정상 기동 시 <a href="#back">원복</a> 진행.
* WAS 정상 기동 시 <a href="#test">테스트</a> 진행

#### 2.5. CMS
 - 대화엔진 인스턴스 : ecms_cms

##### 2.5.1. CMS 빌드
 1. Terminal 화면에서 Easy Cms Project 폴더로 이동
 2. gradle -p ./**_cms_** clean build -x test -Pprofile=**_prod_**  명령어 실행
 3. Easy Cms Project 폴더 > cms > build > libs > _cms-SNAPSHOT.war_ 파일 생성 확인
 4. _cms-SNAPSHOT.war_ 파일을 _ROOT.war_현재날짜_생성횟수_  로 파일명 변경 _ex) ROOT.war_20210527_1_

##### 2.5.2. CMS 배포
 1. 대화엔진 SFTP jboss 접속
 2. 빌드한 파일을 /jboss/applications/ 경로로 업로드
 3. /jboss/applications/ecms_cms 인스턴스 폴더로 빌드한 파일 복사
 4. /jboss/domains/ecms_cms 인스턴스 셧다운(stop 또는 kill)
 5. 기존 _ROOT.war_ 파일을 _ROOT.war_backup_현재날짜_ 로 변경
 6. 복사된 새로 빌드한 파일명을 _ROOT.war_ 로 변경
 7. /jboss/domains/ecms_cms 인스턴스 부팅(start)

 * WAS 정상 기동여부를 확인 한다.
 * WAS 비정상 기동 시 <a href="#back">원복</a> 진행.
 * WAS 정상 기동 시 <a href="#test">테스트</a> 진행


#### 2.6. Scheduler
 - 대화엔진 인스턴스 : ecms_batch

##### 2.6.1. Scheduler 빌드
 1. Terminal 화면에서 Easy Cms Project 폴더로 이동
 2. gradle -p ./**_scheduler_** clean build -x test -Pprofile=**_prod_**  명령어 실행
 3. Easy Cms Project 폴더 > scheduler > build > libs > _scheduler-SNAPSHOT.war_ 파일 생성 확인
 4. _scheduler-SNAPSHOT.war_ 파일을 _ROOT.war_현재날짜_생성횟수_  로 파일명 변경 _ex) ROOT.war_20210527_1_

##### 2.6.2. Scheduler 배포
 1. CMS AP01 SFTP jboss 접속
 2. 빌드한 파일을 /jboss/applications/ 경로로 업로드
 3. /jboss/applications/ecms_batch 인스턴스 폴더로 빌드한 파일 복사
 4. /jboss/domains/ecms_batch 인스턴스 셧다운(stop 또는 kill)
 5. 기존 _ROOT.war_ 파일을 _ROOT.war_backup_현재날짜_ 로 변경
 6. 복사된 새로 빌드한 파일명을 _ROOT.war_ 로 변경
 7. /jboss/domains/ecms_batch 인스턴스 부팅(start)

 * WAS 정상 기동여부를 확인 한다.
 * WAS 비정상 기동 시 <a href="#back">원복</a> 진행.


<a id="test"></a>
##### 테스트
* http://203.254.128.229 에서 테스트 진행
* <a href="#check_list">1. 체크리스트</a> 에서 배포 진행한 항목을 테스트한다.
* 테스트 결과 통과하지 못했을 경우 원복을 진행한다.

<a id="back"></a>
##### 원복
* 인스턴스 셧다운
* SFTP에서 새로 적용한 war파일을 삭제
* 백업 해놓은 war파일의 파일명을 원복 후 부팅
* <a href="#check_list">1. 체크리스트</a> 항목 테스트하여 정상 원복 확인

~~~

### `docs\99.ETC\EasyCMS_deploy_manual.md`

~~~text
# KT EasyCms EPC, G-Cloud Deploy Manual

### Revision History
Version | Issue                                     | Author        | Updated
:------:|:------------------------------------------|:-------------:|:-----------:
 v1.0.0 | 초안 작성                                   | 송시욱         | 2021-05-27

### EPC Server 정보
서버명                 | 장비용도      | OS        | CPU   | Memory    | Disk  | IP Address        | Software  | Application
:--------------------:|:-------------|:---------|:-----:|:----------|:-------|:----------------:|:----------|:----------------
L4                    | Web L4       |           |       |          |         |  10.213.177.159  |           |
prd-escweb01          | Web          | CentOS 7.6 | 4    | 8G        |        | 10.213.177.147   | nginx     |
prd-escweb01          | Web          | CentOS 7.6 | 4    | 8G        |        | 10.213.177.148   | nginx     |
prd-esvcv01           | 채널 GW AP    | CentOS 7.6 | 8    | 16G       |        | 10.213.177.73     | nginx<br>wildfly<br>logstash| Chat UI<br>채널 G/W
prd-esvcv02           | 채널 GW AP    | CentOS 7.6 | 8    | 16G       |        | 10.213.177.74     | nginx<br>wildfly<br>logstash| Chat UI<br>채널 G/W
Engine L4             | Engine L4    |           |       |           |        | 10.213.177.91   |           |
prd-escsvc03          | Engine AP    | CentOS 7.6 |  8   | 16G       |        | 10.213.177.75   | nginx<br>wildfly<br>logstash| EasyCMS Engine
prd-escsvc04          | Engine AP    | CentOS 7.6 |  8   | 16G       |        | 10.213.177.76   | nginx<br>wildfly<br>logstash| EasyCMS Engine
CMS L4                | CMS L4       |           |        |          |        | 10.213.177.92   |           |
prd-escsv05           | CMS          | CentOS 7.6 | 8    | 16G       |        | 10.213.177.48     | nginx<br>wildfly| EasyCMS CMS
prd-escsv06           | CMS          | CentOS 7.6 | 8    | 16G       |        | 10.213.177.49     | nginx<br>wildfly| EasyCMS CMS
DB VIP                | DB VIP       |           |        |          |        |                   |           |
prd-escdb01           | DB           | CentOS 7.6| 8     | 16G       |        | 10.213.177.68     | postgres 11|
prd-escdb02           | DB           | CentOS 7.6| 8     | 16G       |        | 10.213.177.69     | postgres 11|
prd-escredis01        | redis1<br>solr1<br>es1 | CentOS 7.6 | 8 |32G |        | 10.213.177.70     | redis<br>solr<br>Elasticsearch<br>zookeeper     |
prd-escredis02        | redis2<br>solr2<br>es2 | CentOS 7.6 | 8 |32G |        | 10.213.177.71    | redis<br>solr<br>Elasticsearch<br>zookeeper      |
prd-escredis03        | redis3<br>solr3<br>es3 | CentOS 7.6 | 8 |32G |        | 10.213.177.72    | redis<br>solr<br>Elasticsearch<br>zookeeper      |



### G-Cloud Server 정보
서버명                 | 장비용도      | OS        | CPU   | Memory    | Disk  | IP Address        | Software  | Application
:--------------------:|:-------------|:---------|:-----:|:----------|:-------|:----------------:|:----------|:----------------
prd-esvcv01           | 채널 GW AP    |           |       |           |        | 10.213.189.166     | nginx<br>wildfly<br>logstash| Chat UI<br>채널 G/W
prd-esvcv02           | 채널 GW AP    |           |       |           |        | 10.213.189.215     | nginx<br>wildfly<br>logstash| Chat UI<br>채널 G/W
prd-escsvc03          | Engine AP    |            |      |           |        | 10.213.189.234     | nginx<br>wildfly<br>logstash| EasyCMS Engine
prd-escsvc04          | Engine AP    |            |      |           |        | 10.213.189.248     | nginx<br>wildfly<br>logstash| EasyCMS Engine
prd-escsv05           | CMS          |            |      |           |        | 10.213.189.174     | nginx<br>wildfly| EasyCMS CMS
prd-escsv06           | CMS          |            |      |           |        | 10.213.189.243     | nginx<br>wildfly| EasyCMS CMS
prd-escdb01           | DB           |            |      |           |        | 10.213.189.149    | postgres 11|
prd-escdb02           | DB           |            |      |          |         | 10.213.189.167     | postgres 11|


<a id="check_list"></a>

### 1. 배포 전(TB)/후(PRD) 체크리스트
#### 1.1. G/W, Chat UI, Engine

* 배포테스트봇 시뮬레이터를 이용하여 배포테스트대화 진행 및 G/W,Engine 로그 정상 확인


#### 1.2. CMS
항목              | 상세                                                | 비고
:---------------:|:----------------------------------------------------|:-----------
로그인             | CMS 로그인 성공 확인                                  |
채널 관리           | 채널 목록 및 상세화면 조회                           |
대화 관리           | 의도 목록 및 상세화면 조회 / Excel Download 정상 확인   |
파라미터 관리       | 파라미터 목록 및 상세 조회 / Excel Download 정상 확인    |
검증 관리           | 검증 관리 질문내용 검색 결과 및 형태소 분석 검색 후 Solr와 일치하는지 확인 |
어댑터API 관리       | 어댑터 API 관리 및 상세화면 조회 |
개체명 관리           | 개체명 목록, 상세화면 및 개체 항목 조회 / Excel Download 정상 확인 |
컨펌 개체명 관리    | 컨펌 개체명 목록 및 상세 조회 / Excel Download 정상 확인 |
동의어 관리           | 동의어 목록 및 상세 조회 / Excel Download 정상 확인 |
오타 관리            | 오타 목록 및 상세 조회 / Excel Download 정상 확인 |
불용어 관리           | 불용어 목록 및 상세 조회 / Excel Download 정상 확인 |
사용자 사전 관리        | 사용자 사전 관리 목록 및 상세 조회 / Excel Download 정상 확인 |
채팅 로그 | 채팅 로그 조회, 대화 보기로 상세 진입 후 내용 확인 |
학습 로그 | 학습 후 학습 로그 조회 |
배포 로그 | 배포 후 배포 로그 조회 |
대화 로그 | 의도 저작도구 수정 및 등록 후 대화 로그 목록 조회 및 상세내용 확인 |
의도 로그 | 의도 수정 및 등록 후 목록 조회 및 상세화면에서 예문 변경 확인|
배치 로그 | 배치 로그 목록 조회 |
봇 만족도 로그 | 봇 만족도 로그 목록 조회 |
대화 만족도 로그 | 대화 만족도 로그 조회, 기타의견 존재 시 상세 진입 후 내용 확인 |
미답변 로그 | 미답변 로그 목록 조회 / Excel Download 정상 확인 |
접속자수 통계 | 검색 구분별로 조회 / 검색 결과 Excel Download 및 검색지능화 Excel Download 정상 확인 |
대화 통계 | 검색 구분별로 조회 / Excel Download 정상 확인 |
지식 현황 | 검색 구분별로 조회 / Excel Download 정상 확인 |
Top10 현황 | 검색 구분별로 조회 / Top100 및 전체 Excel Download 정상 확인 |
만족도 조사 통계 | 검색 구분별로 조회 / Excel Download 정상 확인 |
사용자 관리 | 사용자 목록 조회 및 상세 조회 |
권한 관리 | 권한 목록 조회 및 상세 조회 |
봇 카테고리 관리 | 봇 카테고리 목록 조회 및 상세 조회 |
고객사 관리 | 고객사 목록 조회 및 상세 조회 |
코드 관리 | 코드 목록 조회 및 상세 조회 |
학습추천 | 학습 추천 목록 조회 / Excel Download 정상 확인 |

#### 1.3. Scheduler
항목              | 상세                                                | 비고
:---------------:|:----------------------------------------------------|:-----------
RCS 토큰 갱신      | 각 Scheduler 인스턴스의 RCS_CREATE_TOKEN 로그 확인 |
예약 배포          | 각 Scheduler 인스턴스의 RESERVE_DEPLOY_JOB 로그 확인 |
학습 추천          | 각 Scheduler  인스턴스의 LEARN_RECOMMEND_JOB 로그 확인 |
접속자수 통계       | 각 Scheduler 인스턴스의 USER_STATISTIC 로그 확인 |
대화 통계          | 각 Scheduler 인스턴스의 DIALOG_STATISTIC 로그 확인 |
만족도 조사 통계    | 각 Scheduler 인스턴스의 SATISFACTION_STATISTIC 로그 확인 |
지식 현황 통계      | 각 Scheduler 인스턴스의 KNOWLEDGE_STATISTIC 로그 확인 |
Top 10대화 통계    | 각 Scheduler 인스턴스의 TOP10_DIALOG_STATISTIC 로그 확인 |


### 2. 배포절차
#### 2.1. G/W
##### EPC
 - prd-esvcv01 인스턴스 : ecms_gw11, ecms_gw12
 - prd-esvcv02 인스턴스 : ecms_gw21, ecms_gw22

##### G-Cloud
 - prd-esvcv01 인스턴스 : ecms_gw11, ecms_gw12
 - prd-esvcv02 인스턴스 : ecms_gw21, ecms_gw22

##### 2.1.1. G/W 빌드
 1. Terminal 화면에서 Easy Cms Project 폴더로 이동
 2. gradle -p ./**_gateway_** clean build -x test -Pprofile=**_prod_** 또는 **_gcloud_**   명령어 실행
 3. Easy Cms Project 폴더 > gateway > build > libs > _gateway-SNAPSHOT.war_ 파일 생성 확인
 4. _gateway-SNAPSHOT.war_ 파일을 _ROOT.war_현재날짜_생성횟수_  로 파일명 변경 _ex) ROOT.war_20210527_1_

##### 2.1.2. G/W 배포
 1. G/W AP01 SFTP jboss 접속
 2. 빌드한 파일을 /jboss/applications/ 경로로 업로드
 3. applications/ecms_gw11 인스턴스 폴더로 빌드한 파일 복사
 4. domains/ecms_gw11 인스턴스 셧다운(stop 또는 kill)
 5. 기존 _ROOT.war_ 파일을 _ROOT.war_backup_현재날짜_ 로 변경
 6. 복사된 새로 빌드한 파일을 _ROOT.war_ 로 변경
 7.  domains/ecms_gw11 인스턴스 부팅(start)

 * WAS 정상 기동여부를 확인 한다.
 * WAS 비정상 기동 시 <a href="#back">원복</a> 진행.
 * WAS 정상 기동 시 나머지 인스턴스 셧다운 후 <a href="#test">테스트</a> 진행
 * 테스트 통과 시 나머지 인스턴스 모두 배포 후 다시 테스트 진행


#### 2.2. Chat UI
##### EPC
 - prd-esvcv01 인스턴스 : ecms_gw13, ecms_gw14
 - prd-esvcv02 인스턴스 : ecms_gw24, ecms_gw24

##### G-Cloud
 - prd-esvcv01 인스턴스 : ecms_gw13, ecms_gw14
 - prd-esvcv02 인스턴스 : ecms_gw24, ecms_gw24

##### 2.2.1. Chat UI 빌드
 1. Terminal 화면에서 Easy Cms Project 폴더로 이동
 2. gradle -p ./**_chat-ui_** clean build -x test -Pprofile=**_prod_**  또는 **_gcloud_**   명령어 실행
 3. Easy Cms Project 폴더 > chat-ui > build > libs > _client-SNAPSHOT.war_ 파일 생성 확인
 4. _chat-ui-SNAPSHOT.war_ 파일을 _client.war_현재날짜_생성횟수_  로 파일명 변경 _ex) client.war_20210527_1_

##### 2.2.2. Chat UI 배포
 1. G/W AP01 SFTP jboss 접속
 2. 빌드한 파일을 /jboss/applications/ 경로로 업로드
 3. applications/ecms_gw13 인스턴스 폴더로 빌드한 파일 복사
 4. domains/ecms_gw13 인스턴스 셧다운(stop 또는 kill)
 5. 기존 _client.war_ 파일을 _client.war_backup_현재날짜_ 로 변경
 6. 복사된 새로 빌드한 파일을 _client.war_ 로 변경
 7.  domains/ecms_gw13 인스턴스 부팅(start)

 * WAS 정상 기동여부를 확인 한다.
 * WAS 비정상 기동 시 <a href="#cu_back">원복</a> 진행.
 * WAS 정상 기동 시 나머지 인스턴스 셧다운 후 <a href="#cu_test">테스트</a> 진행
 * 테스트 통과 시 나머지 인스턴스 모두 배포 후 Clustering 확인을 위해 다시 테스트 진행


#### 2.3. Engine
##### EPC
 - prd-esvcv03 인스턴스 : ecms_ap11, ecms_ap12
 - prd-esvcv04 인스턴스 : ecms_ap21, ecms_ap22

##### G-Cloud
 - prd-esvcv03 인스턴스 : ecms_ap11, ecms_ap12
 - prd-esvcv04 인스턴스 : ecms_ap21, ecms_ap22

##### 2.3.1. Engine 빌드
 1. Terminal 화면에서 Easy Cms Project 폴더로 이동
 2. gradle -p ./**_engine_** clean build -x test -Pprofile=**_prod_**  또는 **_gcloud_**   명령어 실행
 3. Easy Cms Project 폴더 > engine > build > libs > _engine-SNAPSHOT.war_ 파일 생성 확인
 4. _engine-SNAPSHOT.war_ 파일을 _ROOT.war_현재날짜_생성횟수_  로 파일명 변경 _ex) ROOT.war_20210527_1_

##### 2.3.2. Engine 배포
 1. Engine AP01 SFTP jboss 접속
 2. 빌드한 파일을 /jboss/applications/ 경로로 업로드
 3. applications/ecms_ap11 인스턴스 폴더로 빌드한 파일 복사
 4. domains/ecms_ap11 인스턴스 셧다운(stop 또는 kill)
 5. 기존 _ROOT.war_ 파일을 _ROOT.war_backup_현재날짜_ 로 변경
 6. 복사된 새로 빌드한 파일명을 _ROOT.war_ 로 변경
 7. domains/ecms_ap11 인스턴스 부팅(start)

 * WAS 정상 기동여부를 확인 한다.
 * WAS 비정상 기동 시 <a href="#back">원복</a> 진행.
 * WAS 정상 기동 시 나머지 인스턴스 셧다운 후 <a href="#test">테스트</a> 진행
 * 테스트 통과 시 나머지 인스턴스 모두 배포 후 Clustering 확인을 위해 다시 <a href="#test">테스트</a> 진행


#### 2.4. CMS
##### EPC
 - prd-esvcv05 인스턴스 : ecms_cms11
 - prd-esvcv06 인스턴스 : ecms_cms21

##### G-Cloud
  - prd-esvcv05 인스턴스 : ecms_cms***
  - prd-esvcv06 인스턴스 : ecms_cms***

##### 2.4.1. CMS 빌드
 1. Terminal 화면에서 Easy Cms Project 폴더로 이동
 2. gradle -p ./**_cms_** clean build -x test -Pprofile=**_prod_**  또는 **_gcloud_**   명령어 실행
 3. Easy Cms Project 폴더 > cms > build > libs > _cms-SNAPSHOT.war_ 파일 생성 확인
 4. _cms-SNAPSHOT.war_ 파일을 _ROOT.war_현재날짜_생성횟수_  로 파일명 변경 _ex) ROOT.war_20210527_1_

##### 2.4.2. CMS 배포
 1. CMS AP01 SFTP jboss 접속
 2. 빌드한 파일을 /jboss/applications/ 경로로 업로드
 3. applications/ecms_cms11 인스턴스 폴더로 빌드한 파일 복사
 4. domains/ecms_cms11 인스턴스 셧다운(stop 또는 kill)
 5. 기존 _ROOT.war_ 파일을 _ROOT.war_backup_현재날짜_ 로 변경
 6. 복사된 새로 빌드한 파일명을 _ROOT.war_ 로 변경 <br>
  <span style="color:red">유의사항</span> **G-Cloud** 인 경우 파일명이 C100000\*\*\*.war
  ex) 1번 서버, 1번 인스턴스 : C1000001.war
 7. domains/ecms_cms11 인스턴스 부팅(start)


 * WAS 정상 기동여부를 확인 한다.
 * WAS 비정상 기동 시 <a href="#back">원복</a> 진행.
 * WAS 정상 기동 시 나머지 인스턴스 셧다운 후 <a href="#test">테스트</a>> 진행
 * 테스트 통과 시 나머지 인스턴스 모두 배포 후 Clustering 확인을 위해 다시 <a href="#test">테스트</a> 진행




#### 2.5. Scheduler
##### EPC
 - prd-esvcv05 인스턴스 : ecms_cms12

##### G-Cloud
  - prd-esvcv05 인스턴스 : ecms_batch***
  - prd-esvcv06 인스턴스 : ecms_batch***


##### 2.5.1. Scheduler 빌드
 1. Terminal 화면에서 Easy Cms Project 폴더로 이동
 2. gradle -p ./**_scheduler_** clean build -x test -Pprofile=**_prod_**  또는 **_gcloud_**   명령어 실행
 3. Easy Cms Project 폴더 > scheduler > build > libs > _scheduler-SNAPSHOT.war_ 파일 생성 확인
 4. _scheduler-SNAPSHOT.war_ 파일을 _ROOT.war_현재날짜_생성횟수_  로 파일명 변경 _ex) ROOT.war_20210527_1_

##### 2.5.2. Scheduler 배포
 1. CMS AP01 SFTP jboss 접속
 2. 빌드한 파일을 /jboss/applications/ 경로로 업로드
 3. applications/ecms_cms12 인스턴스 폴더로 빌드한 파일 복사
 4. domains/ecms_cms12 인스턴스 셧다운(stop 또는 kill)
 5. 기존 _ROOT.war_ 파일을 _ROOT.war_backup_현재날짜_ 로 변경
 6. 복사된 새로 빌드한 파일명을 _ROOT.war_ 로 변경
 7. domains/ecms_cms12 인스턴스 부팅(start)
   <span style="color:red">유의사항</span> **G-Cloud** 인 경우 폴더명이 _ecms_batch_


 * WAS 정상 기동여부를 확인 한다.
 * WAS 비정상 기동 시 <a href="#back">원복</a> 진행.
 * ~~WAS 정상 기동 시 나머지 인스턴스 셧다운 후 <a href="#test">테스트</a>> 진행~~


<br>

<a id="test"></a>

##### 테스트
* EPC     - https://escms.kt-aicc.com/ 에서 테스트 진행
* G-Cloud - https://cms.gov.kt-aicc.com/{ContextPath}/ 에서 테스트 진행 (ContextPath :  고객사ID)
* <a href="#check_list">1. 체크리스트</a> 에서 배포 진행한 항목을 테스트한다.
* 테스트 결과 통과하지 못했을 경우 원복을 진행한다.

<a id="back"></a>

##### 원복
* 인스턴스 셧다운
* SFTP에서 새로 적용한 war파일을 삭제
* 백업 해놓은 war파일의 파일명을 원복 후 부팅
* <a href="#check_list">1. 체크리스트</a> 항목 테스트하여 정상 원복 확인


~~~

### `engine\pom.xml`

~~~text
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <parent>
        <groupId>com.kt.aicc</groupId>
        <version>0.0.1-SNAPSHOT</version>
        <artifactId>ktbot</artifactId>
    </parent>
    <modelVersion>4.0.0</modelVersion>

    <artifactId>engine</artifactId>
    <version>0.0.1-SNAPSHOT</version>
    <packaging>jar</packaging>

    <dependencies>
        <dependency>
            <groupId>com.kt.aicc</groupId>
            <artifactId>common</artifactId>
            <version>${project.version}</version>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-undertow</artifactId>
            <scope>provided</scope>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-webflux</artifactId>
        </dependency>

        <dependency>
            <groupId>junit</groupId>
            <artifactId>junit</artifactId>
            <version>4.12</version>
            <scope>test</scope>
        </dependency>

        <!-- Jackson XML -->
        <dependency>
            <groupId>com.fasterxml.jackson.core</groupId>
            <artifactId>jackson-core</artifactId>
            <version>${jackson.version}</version>
        </dependency>
        <dependency>
            <groupId>com.fasterxml.jackson.core</groupId>
            <artifactId>jackson-databind</artifactId>
            <version>${jackson.version}</version>
        </dependency>
        <dependency>
            <groupId>com.fasterxml.jackson.dataformat</groupId>
            <artifactId>jackson-dataformat-xml</artifactId>
            <version>${jackson.version}</version>
        </dependency>
        <dependency>
            <groupId>com.fasterxml.jackson.core</groupId>
            <artifactId>jackson-annotations</artifactId>
            <version>${jackson.version}</version>
        </dependency>

    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
            </plugin>
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-compiler-plugin</artifactId>
                <version>3.1</version>
                <configuration>
                    <source>${java.version}</source>
                    <target>${java.version}</target>
                </configuration>
            </plugin>
        </plugins>
    </build>
</project>
~~~

### `engine\src\main\resources\application-dev.yml`

~~~text
server:
  port: 8180

logging:
  config: classpath:logging-dev-config.xml

spring:
  profiles:
    include: core-dev
adapter:
  tb:
    url: https://api.aigw.kt.co.kr
    authKey: DKA+zJSSqYGTVtRv1sZn88KQlxI7E2JKV/fgvLScPYo=
  prod:
    url: https://api.aigw.kt.co.kr
    authKey: DKA+zJSSqYGTVtRv1sZn88KQlxI7E2JKV/fgvLScPYo=
cms:
  url: http://localhost:8280
search:
  ui:
    url: http://10.213.177.159/client/pc-web/chat.html
cipher:
  key : <REDACTED>


solr:
  confirmMatchesApi: /confirmMatches
  confirmMatchesMaxCount: 20

jasypt:
  encryptor:
    bean: encryptorBean
    pkey: SYgwO1juM

phoneSecretary: <REDACTED>
  url: http://10.213.176.196

server-division:
  name: dev
~~~

### `engine\src\main\resources\application-prod.yml`

~~~text
server:
  port: 8180

logging:
  config: classpath:logging-prod-config.xml

spring:
  profiles:
    include: core-prod
adapter:
  tb:
    url: https://api.aigw.kt.co.kr
    authKey: DKA+zJSSqYGTVtRv1sZn88KQlxI7E2JKV/fgvLScPYo=
  prod:
    url: https://api.aigw.kt.co.kr
    authKey: DKA+zJSSqYGTVtRv1sZn88KQlxI7E2JKV/fgvLScPYo=
cms:
  url: http://vbcms.meritzfire.com
search:
  ui:
    url: http://10.213.177.159/client/pc-web/chat.html
cipher:
  key : <REDACTED>


solr:
  confirmMatchesApi: /confirmMatches
  confirmMatchesMaxCount: 20

jasypt:
  encryptor:
    bean: encryptorBean
    pkey: SYgwO1juM

phoneSecretary: <REDACTED>
  url: http://10.213.176.196

server-division:
  name: dev
~~~

### `engine\src\main\resources\application-tb.yml`

~~~text
server:
  port: 8180

logging:
  config: classpath:logging-tb-config.xml

spring:
  profiles:
    include: core-tb
adapter:
  tb:
    url: https://api.aigw.kt.co.kr
    authKey: DKA+zJSSqYGTVtRv1sZn88KQlxI7E2JKV/fgvLScPYo=
  prod:
    url: https://api.aigw.kt.co.kr
    authKey: DKA+zJSSqYGTVtRv1sZn88KQlxI7E2JKV/fgvLScPYo=
cms:
  url: http://localhost:8280
search:
  ui:
    url: http://10.213.177.159/client/pc-web/chat.html
cipher:
  key : <REDACTED>


solr:
  confirmMatchesApi: /confirmMatches
  confirmMatchesMaxCount: 20

jasypt:
  encryptor:
    bean: encryptorBean
    pkey: SYgwO1juM

phoneSecretary: <REDACTED>
  url: http://10.213.176.196

server-division:
  name: dev
~~~

### `engine\src\main\resources\application-tc.yml`

~~~text
server:
  port: 8180

logging:
  config: classpath:logging-tc-config.xml

spring:
  profiles:
    include: core-tc
adapter:
  tb:
    url: https://api.aigw.kt.co.kr
    authKey: DKA+zJSSqYGTVtRv1sZn88KQlxI7E2JKV/fgvLScPYo=
  prod:
    url: https://api.aigw.kt.co.kr
    authKey: DKA+zJSSqYGTVtRv1sZn88KQlxI7E2JKV/fgvLScPYo=
cms:
  url: http://localhost:8280
search:
  ui:
    url: http://10.213.177.159/client/pc-web/chat.html
cipher:
  key : <REDACTED>


solr:
  confirmMatchesApi: /confirmMatches
  confirmMatchesMaxCount: 20

jasypt:
  encryptor:
    bean: encryptorBean
    pkey: SYgwO1juM

phoneSecretary: <REDACTED>
  url: http://10.213.176.196

server-division:
  name: dev
~~~

### `engine\src\main\resources-dev\application.yml`

~~~text
server:
  port: 8180

logging:
  config: classpath:logging-config.xml

spring:
  profiles:
    include: core
adapter:
  tb:
    url: https://api.aigw.kt.co.kr
    authKey: DKA+zJSSqYGTVtRv1sZn88KQlxI7E2JKV/fgvLScPYo=
  prod:
    url: https://api.aigw.kt.co.kr
    authKey: DKA+zJSSqYGTVtRv1sZn88KQlxI7E2JKV/fgvLScPYo=
cms:
  url: http://localhost:8280
search:
  ui:
    url: http://10.213.177.159/client/pc-web/chat.html
cipher:
  key : <REDACTED>


solr:
  confirmMatchesApi: /confirmMatches
  confirmMatchesMaxCount: 20

jasypt:
  encryptor:
    bean: encryptorBean
    pkey: SYgwO1juM

phoneSecretary: <REDACTED>
  url: http://10.213.176.196

server-division:
  name: dev
~~~

### `engine\src\main\resources-local\application.yml`

~~~text
server:
  port: 8180

logging:
  config: classpath:logging-config.xml

spring:
  profiles:
    include: core
    active: local

redis:
  pool:
    max: 20
    min-idle: 10
    max-idle: 5
  hosts: redis1
  connection-time-out: 3000
  port: 5000


# ===============================
# Solr Property
# ===============================
solr:
  url: http://solr1:8983/solr
  configSetApi: /admin/configs
  collections: /admin/collections
  zookeeperApi: /zookeeper
  queryApi: /textanalysis
  analysisApi: /analysis/field
  fieldTypeApi: /schema/fieldtypes
  bestMatchesApi: /bestmatches
  nerApi : /tag
  autocompleteApi : /autocomplete

  createNodeSetNode1: solr1:8983_solr
  createNodeSetNode2: solr2:8984_solr
  createNodeSetNode3: solr3:8985_solr
  confirmMatchesApi: /confirmMatches
  confirmMatchesMaxCount: 20

  urls: http://solr1:8983/solr,http://solr2:8984/solr,http://solr3:8985/solr
  zk:
    hosts: zk1:2181,zk2:2182,zk3:2183
    timeout: 1000

script:
  solr:
    backup: ${user.home}/script/solrBackup.sh

adapter:
  tb:
    url: http://10.217.69.132:8080
    authKey: DKA+zJSSqYGTVtRv1sZn88KQlxI7E2JKV/fgvLScPYo=
  prod:
    url: http://10.217.69.132:8080
    authKey: DKA+zJSSqYGTVtRv1sZn88KQlxI7E2JKV/fgvLScPYo=
cms:
  url: http://localhost:8280

search:
  ui:
    url: http://test.ibot.kt.com/client/default/chat.html

cipher:
  key : <REDACTED>
lamp:
  service-code: CO007701


phoneSecretary: <REDACTED>
  url: http://10.213.176.196


jasypt:
  encryptor:
    bean: encryptorBean
    pkey: SYgwO1juM

server-division:
  name: local
~~~

### `engine\src\main\resources-prod\application.yml`

~~~text
server:
  port: 8280

logging:
  config: classpath:logging-config.xml

spring:
  profiles:
    include: core
adapter:
  tb:
    url: https://api.aigw.kt.co.kr
    authKey: DKA+zJSSqYGTVtRv1sZn88KQlxI7E2JKV/fgvLScPYo=
  prod:
    url: https://api.aigw.kt.co.kr
    authKey: DKA+zJSSqYGTVtRv1sZn88KQlxI7E2JKV/fgvLScPYo=
cms:
  url: http://localhost:8480
search:
  ui:
    url: http://10.213.177.159/client/pc-web/chat.html
cipher:
  key : <REDACTED>


solr:
  confirmMatchesApi: /confirmMatches
  confirmMatchesMaxCount: 20

jasypt:
  encryptor:
    bean: encryptorBean
    pkey: SYgwO1juM

phoneSecretary: <REDACTED>
  url: http://10.213.176.196

server-division:
  name: prod
~~~

### `gateway\pom.xml`

~~~text
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <parent>
        <groupId>com.kt.aicc</groupId>
        <version>0.0.1-SNAPSHOT</version>
        <artifactId>ktbot</artifactId>
    </parent>
    <modelVersion>4.0.0</modelVersion>

    <artifactId>gateway</artifactId>
    <version>0.0.1-SNAPSHOT</version>
    <packaging>jar</packaging>

    <dependencies>
        <dependency>
            <groupId>com.kt.aicc</groupId>
            <artifactId>common</artifactId>
            <version>${project.version}</version>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-undertow</artifactId>
            <scope>provided</scope>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
            <exclusions>
                <exclusion>
                    <groupId>org.springframework.boot</groupId>
                    <artifactId>spring-boot-starter-tomcat</artifactId>
                </exclusion>
            </exclusions>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-webflux</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework</groupId>
            <artifactId>spring-websocket</artifactId>
            <version>${spring-websocket.version}</version>
        </dependency>
        <dependency>
            <groupId>javax.websocket</groupId>
            <artifactId>javax.websocket-api</artifactId>
            <version>${websocket-api.version}</version>
        </dependency>

        <dependency>
            <groupId>junit</groupId>
            <artifactId>junit</artifactId>
            <version>4.12</version>
            <scope>test</scope>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
            </plugin>
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-compiler-plugin</artifactId>
                <version>3.1</version>
                <configuration>
                    <source>${java.version}</source>
                    <target>${java.version}</target>
                </configuration>
            </plugin>
        </plugins>
    </build>
</project>
~~~

### `gateway\src\main\resources\application-dev.yml`

~~~text
server:
  port: 8081

logging:
  config: classpath:logging-dev-config.xml

spring:
  profiles:
    include: core-dev
  devtools:
    livereload:
      enabled: false
  servlet:
    multipart:
      max-file-size: 100MB

engine:
  api:
    url: http://localhost:8180

# 일단 패스
erms:
  api:
    url: http://10.220.194.90

web:
  api:
    url: http://10.213.177.159:1080
  client:
    url: http://10.213.177.159/client

elastic:
  api:
    url: http://localhost:9200

# ===============================
# = Kakao Chatbot I/F Info
# ===============================
kakao:
  spectra:
    api:
      url: https://kakao-apis.enomix.co.kr
    not:
      file:
        message: 이미지, 동영상은 첨부할 수 없습니다.
      audio:
        message: 음성 메시지는 전송 할 수 없습니다.
  channel:
    open:
      url: https://bizmessage.kakao.com
  chatbot:
    not:
      file:
        message: KAKAO 파일 메시지 지원 가이드

# ===============================
# = Facebook Chatbot I/F Info
# ===============================
facebook:
  send:
    api:
      url: https://graph.facebook.com
      version: v7.0
  erms:
    not:
      file:
        message: 이미지, 동영상은 첨부할 수 없습니다
      audio:
        message: 음성 메시지는 전송 할 수 없습니다.
  chatbot:
    not:
      file:
        message: FACEBOOK 파일 메시지 지원 가이드
      audio:
        message: FACEBOOK 음성 메시지 지원 가이드

# ===============================
# =SamsungRCS Chatbot I/F Info
# ===============================
#삼성RCS 토큰 갱신 주기 120분 : client_credentials 115 이후 갱신, refresh_token 115 -10 분전 갱신
#삼성RCS 메이지전송 Connection Out 20초
#삼성RCS 메이지전송 Read Out 20초
#삼성RCS ExternalUrl 제외 이미지 확장자
#삼성 RCS 파일 메시지 지원 유무
#삼성 RCS 파일메시지 지원하지 않을경우 의도
#삼성 RCS 음성 메시지 지원 유무
#삼성 RCS 음성 지원하지 않을경우 의도
samsung:
  rcs:
    erms:
      not:
        file:
          message: 이미지, 동영상은 첨부할 수 없습니다
        audio:
          message: 음성 메시지는 전송 할 수 없습니다.
    chatbot:
      token: <REDACTED>
      minutes: 115
      minus-minutes: 10
      domain: https://api.maapconnect.com
      o:
        auth:
          token: <REDACTED>
            uri: /oauth2/v1/token
      send:
        connect:
          timeout: 20000
        read:
          timeout: 20000
      start:
        send:
          welcome:
            message: true
      not:
        external:
          url:
            extension: bmp,rle,dib,gif,dcm,dc3,dic,eps,iff,tdi,jpg,jpeg,jpe,jpf,jpx,jp2,jc2c,j2k,jpc,pcx,raw,pxr,png
        file:
          message: RCS 파일 메시지 지원 가이드
        audio:
          message: RCS 음성 메시지 지원 가이드
      file:
        message: false
      audio:
        message: false
#        id: EXT0000000009179
#        secret: OSY4O82uiIwdliOh4eSufjGCrMr8IpZYJzDSh1dv760
#      verification:
#$        token: i232iaeI_MBJc275KpqCLHBQnrrS_4uCdP5wqufdxOQ
#      domain: https://api.maapconnect.com

# ===============================
# = Elasticsearch Property
# ===============================

elasticsearch:
  clustername: meritz-es
  host1: localhost
  host2: localhost
  host3: localhost
  port: 9200
  scheme: http

# ===============================
# = RSA PrivateKey Property
# ===============================
rsa:
  privateKey: <REDACTED>

# ===============================
# = Chat Engine Property
# ===============================
chatengine:
  url: http://localhost:8180
  startApi: /start
  talkApi: /talk

session:
  prefix: gw1

adapter:
  tb:
    url: http://10.217.69.132
  prod:
    url: https://api.aigw.kt.co.kr

cipher:
  key : <REDACTED>
~~~

### `gateway\src\main\resources\application-prod.yml`

~~~text
server:
  port: 8081

logging:
  config: classpath:logging-prod-config.xml

spring:
  profiles:
    include: core-prod
  devtools:
    livereload:
      enabled: false
  servlet:
    multipart:
      max-file-size: 100MB

engine:
  api:
    url: http://10.20.30.243:8180

# 일단 패스
erms:
  api:
    url: http://10.220.194.90

web:
  api:
    url: http://10.213.177.159:1080
  client:
    url: http://10.213.177.159/client

elastic:
  api:
    url: http://localhost:9200

# ===============================
# = Kakao Chatbot I/F Info
# ===============================
kakao:
  spectra:
    api:
      url: https://kakao-apis.enomix.co.kr
    not:
      file:
        message: 이미지, 동영상은 첨부할 수 없습니다.
      audio:
        message: 음성 메시지는 전송 할 수 없습니다.
  channel:
    open:
      url: https://bizmessage.kakao.com
  chatbot:
    not:
      file:
        message: KAKAO 파일 메시지 지원 가이드

# ===============================
# = Facebook Chatbot I/F Info
# ===============================
facebook:
  send:
    api:
      url: https://graph.facebook.com
      version: v7.0
  erms:
    not:
      file:
        message: 이미지, 동영상은 첨부할 수 없습니다
      audio:
        message: 음성 메시지는 전송 할 수 없습니다.
  chatbot:
    not:
      file:
        message: FACEBOOK 파일 메시지 지원 가이드
      audio:
        message: FACEBOOK 음성 메시지 지원 가이드

# ===============================
# =SamsungRCS Chatbot I/F Info
# ===============================
#삼성RCS 토큰 갱신 주기 120분 : client_credentials 115 이후 갱신, refresh_token 115 -10 분전 갱신
#삼성RCS 메이지전송 Connection Out 20초
#삼성RCS 메이지전송 Read Out 20초
#삼성RCS ExternalUrl 제외 이미지 확장자
#삼성 RCS 파일 메시지 지원 유무
#삼성 RCS 파일메시지 지원하지 않을경우 의도
#삼성 RCS 음성 메시지 지원 유무
#삼성 RCS 음성 지원하지 않을경우 의도
samsung:
  rcs:
    erms:
      not:
        file:
          message: 이미지, 동영상은 첨부할 수 없습니다
        audio:
          message: 음성 메시지는 전송 할 수 없습니다.
    chatbot:
      token: <REDACTED>
      minutes: 115
      minus-minutes: 10
      domain: https://api.maapconnect.com
      o:
        auth:
          token: <REDACTED>
            uri: /oauth2/v1/token
      send:
        connect:
          timeout: 20000
        read:
          timeout: 20000
      start:
        send:
          welcome:
            message: true
      not:
        external:
          url:
            extension: bmp,rle,dib,gif,dcm,dc3,dic,eps,iff,tdi,jpg,jpeg,jpe,jpf,jpx,jp2,jc2c,j2k,jpc,pcx,raw,pxr,png
        file:
          message: RCS 파일 메시지 지원 가이드
        audio:
          message: RCS 음성 메시지 지원 가이드
      file:
        message: false
      audio:
        message: false
#        id: EXT0000000009179
#        secret: OSY4O82uiIwdliOh4eSufjGCrMr8IpZYJzDSh1dv760
#      verification:
#$        token: i232iaeI_MBJc275KpqCLHBQnrrS_4uCdP5wqufdxOQ
#      domain: https://api.maapconnect.com

# ===============================
# = Elasticsearch Property
# ===============================

elasticsearch:
  clustername: meritz-es
  host1: es1
  host2: es2
  host3: es3
  port: 9200
  scheme: http

# ===============================
# = RSA PrivateKey Property
# ===============================
rsa:
  privateKey: <REDACTED>

# ===============================
# = Chat Engine Property
# ===============================
chatengine:
  url: http://10.20.30.243:8180
  startApi: /start
  talkApi: /talk

session:
  prefix: gw1

adapter:
  tb:
    url: http://10.217.69.132
  prod:
    url: https://api.aigw.kt.co.kr

cipher:
  key : <REDACTED>
~~~

### `gateway\src\main\resources\application-tb.yml`

~~~text
server:
  port: 8080

logging:
  config: classpath:logging-tb-config.xml

spring:
  profiles:
    include: core-tb
  devtools:
    livereload:
      enabled: false
  servlet:
    multipart:
      max-file-size: 100MB

engine:
  api:
    url: http://localhost:8180

# 일단 패스
erms:
  api:
    url: http://10.220.194.90

web:
  api:
    url: http://10.213.177.159:1080
  client:
    url: http://10.213.177.159/client

elastic:
  api:
    url: http://localhost:9200

# ===============================
# = Kakao Chatbot I/F Info
# ===============================
kakao:
  spectra:
    api:
      url: https://kakao-apis.enomix.co.kr
    not:
      file:
        message: 이미지, 동영상은 첨부할 수 없습니다.
      audio:
        message: 음성 메시지는 전송 할 수 없습니다.
  channel:
    open:
      url: https://bizmessage.kakao.com
  chatbot:
    not:
      file:
        message: KAKAO 파일 메시지 지원 가이드

# ===============================
# = Facebook Chatbot I/F Info
# ===============================
facebook:
  send:
    api:
      url: https://graph.facebook.com
      version: v7.0
  erms:
    not:
      file:
        message: 이미지, 동영상은 첨부할 수 없습니다
      audio:
        message: 음성 메시지는 전송 할 수 없습니다.
  chatbot:
    not:
      file:
        message: FACEBOOK 파일 메시지 지원 가이드
      audio:
        message: FACEBOOK 음성 메시지 지원 가이드

# ===============================
# =SamsungRCS Chatbot I/F Info
# ===============================
#삼성RCS 토큰 갱신 주기 120분 : client_credentials 115 이후 갱신, refresh_token 115 -10 분전 갱신
#삼성RCS 메이지전송 Connection Out 20초
#삼성RCS 메이지전송 Read Out 20초
#삼성RCS ExternalUrl 제외 이미지 확장자
#삼성 RCS 파일 메시지 지원 유무
#삼성 RCS 파일메시지 지원하지 않을경우 의도
#삼성 RCS 음성 메시지 지원 유무
#삼성 RCS 음성 지원하지 않을경우 의도
samsung:
  rcs:
    erms:
      not:
        file:
          message: 이미지, 동영상은 첨부할 수 없습니다
        audio:
          message: 음성 메시지는 전송 할 수 없습니다.
    chatbot:
      token: <REDACTED>
      minutes: 115
      minus-minutes: 10
      domain: https://api.maapconnect.com
      o:
        auth:
          token: <REDACTED>
            uri: /oauth2/v1/token
      send:
        connect:
          timeout: 20000
        read:
          timeout: 20000
      start:
        send:
          welcome:
            message: true
      not:
        external:
          url:
            extension: bmp,rle,dib,gif,dcm,dc3,dic,eps,iff,tdi,jpg,jpeg,jpe,jpf,jpx,jp2,jc2c,j2k,jpc,pcx,raw,pxr,png
        file:
          message: RCS 파일 메시지 지원 가이드
        audio:
          message: RCS 음성 메시지 지원 가이드
      file:
        message: false
      audio:
        message: false
#        id: EXT0000000009179
#        secret: OSY4O82uiIwdliOh4eSufjGCrMr8IpZYJzDSh1dv760
#      verification:
#$        token: i232iaeI_MBJc275KpqCLHBQnrrS_4uCdP5wqufdxOQ
#      domain: https://api.maapconnect.com

# ===============================
# = Elasticsearch Property
# ===============================

elasticsearch:
  clustername: meritz-es
  host1: localhost
  host2: localhost
  host3: localhost
  port: 9200
  scheme: http

# ===============================
# = RSA PrivateKey Property
# ===============================
rsa:
  privateKey: <REDACTED>

# ===============================
# = Chat Engine Property
# ===============================
chatengine:
  url: http://localhost:8180
  startApi: /start
  talkApi: /talk

session:
  prefix: gw1

adapter:
  tb:
    url: http://10.217.69.132
  prod:
    url: https://api.aigw.kt.co.kr

cipher:
  key : <REDACTED>
~~~

### `gateway\src\main\resources\application-tc.yml`

~~~text
server:
  port: 8081

logging:
  config: classpath:logging-tc-config.xml

spring:
  profiles:
    include: core-tc
  devtools:
    livereload:
      enabled: false
  servlet:
    multipart:
      max-file-size: 100MB

engine:
  api:
    url: http://engine:8180

# 일단 패스
erms:
  api:
    url: http://10.220.194.90

web:
  api:
    url: http://10.213.177.159:1080
  client:
    url: http://10.213.177.159/client

elastic:
  api:
    url: http://es1:9200

# ===============================
# = Kakao Chatbot I/F Info
# ===============================
kakao:
  spectra:
    api:
      url: https://kakao-apis.enomix.co.kr
    not:
      file:
        message: 이미지, 동영상은 첨부할 수 없습니다.
      audio:
        message: 음성 메시지는 전송 할 수 없습니다.
  channel:
    open:
      url: https://bizmessage.kakao.com
  chatbot:
    not:
      file:
        message: KAKAO 파일 메시지 지원 가이드

# ===============================
# = Facebook Chatbot I/F Info
# ===============================
facebook:
  send:
    api:
      url: https://graph.facebook.com
      version: v7.0
  erms:
    not:
      file:
        message: 이미지, 동영상은 첨부할 수 없습니다
      audio:
        message: 음성 메시지는 전송 할 수 없습니다.
  chatbot:
    not:
      file:
        message: FACEBOOK 파일 메시지 지원 가이드
      audio:
        message: FACEBOOK 음성 메시지 지원 가이드

# ===============================
# =SamsungRCS Chatbot I/F Info
# ===============================
#삼성RCS 토큰 갱신 주기 120분 : client_credentials 115 이후 갱신, refresh_token 115 -10 분전 갱신
#삼성RCS 메이지전송 Connection Out 20초
#삼성RCS 메이지전송 Read Out 20초
#삼성RCS ExternalUrl 제외 이미지 확장자
#삼성 RCS 파일 메시지 지원 유무
#삼성 RCS 파일메시지 지원하지 않을경우 의도
#삼성 RCS 음성 메시지 지원 유무
#삼성 RCS 음성 지원하지 않을경우 의도
samsung:
  rcs:
    erms:
      not:
        file:
          message: 이미지, 동영상은 첨부할 수 없습니다
        audio:
          message: 음성 메시지는 전송 할 수 없습니다.
    chatbot:
      token: <REDACTED>
      minutes: 115
      minus-minutes: 10
      domain: https://api.maapconnect.com
      o:
        auth:
          token: <REDACTED>
            uri: /oauth2/v1/token
      send:
        connect:
          timeout: 20000
        read:
          timeout: 20000
      start:
        send:
          welcome:
            message: true
      not:
        external:
          url:
            extension: bmp,rle,dib,gif,dcm,dc3,dic,eps,iff,tdi,jpg,jpeg,jpe,jpf,jpx,jp2,jc2c,j2k,jpc,pcx,raw,pxr,png
        file:
          message: RCS 파일 메시지 지원 가이드
        audio:
          message: RCS 음성 메시지 지원 가이드
      file:
        message: false
      audio:
        message: false
#        id: EXT0000000009179
#        secret: OSY4O82uiIwdliOh4eSufjGCrMr8IpZYJzDSh1dv760
#      verification:
#$        token: i232iaeI_MBJc275KpqCLHBQnrrS_4uCdP5wqufdxOQ
#      domain: https://api.maapconnect.com

# ===============================
# = Elasticsearch Property
# ===============================

elasticsearch:
  clustername: meritz-es
  host1: es1
  host2: es2
  host3: es3
  port: 9200
  scheme: http

# ===============================
# = RSA PrivateKey Property
# ===============================
rsa:
  privateKey: <REDACTED>

# ===============================
# = Chat Engine Property
# ===============================
chatengine:
  url: http://engine:8180
  startApi: /start
  talkApi: /talk

session:
  prefix: gw1

adapter:
  tb:
    url: http://10.217.69.132
  prod:
    url: https://api.aigw.kt.co.kr

cipher:
  key : <REDACTED>
~~~

### `gateway\src\main\resources\logstash\logstash.conf`

~~~text
input {
  file {
    path => "/"
    start_position => "beginning"
    sincedb_path = "/chat-log.db"
  }
}

filter {
  dissect {
    mapping => {
      "message" => "%{ts} %{+ts} | %{messageLine}"
    }
  }
  mutate {
    remove_field => ["ts", "path", "message", "messageLine"]
  }
  json {
    source => "messageLine"
  }
}

output {
  elasticsearch {
    hosts => "http://localhost:9200"
    index => "chat-log"
    bulk_path => "http://localhost:9200/_bulk"
    #user => ""
    #password: <REDACTED>
  }
}
~~~

### `gateway\src\main\resources-dev\application.yml`

~~~text
server:
  port: 8080

logging:
  config: classpath:logging-config.xml

spring:
  profiles:
    include: core
  devtools:
    livereload:
      enabled: false
  servlet:
    multipart:
      max-file-size: 100MB

engine:
  api:
    url: http://localhost:8180

# 일단 패스
erms:
  api:
    url: http://10.220.194.90

web:
  api:
    url: http://10.213.177.159:1080
  client:
    url: http://10.213.177.159/client

elastic:
  api:
    url: http://localhost:9200

# ===============================
# = Kakao Chatbot I/F Info
# ===============================
kakao:
  spectra:
    api:
      url: https://kakao-apis.enomix.co.kr
    not:
      file:
        message: 이미지, 동영상은 첨부할 수 없습니다.
      audio:
        message: 음성 메시지는 전송 할 수 없습니다.
  channel:
    open:
      url: https://bizmessage.kakao.com
  chatbot:
    not:
      file:
        message: KAKAO 파일 메시지 지원 가이드

# ===============================
# = Facebook Chatbot I/F Info
# ===============================
facebook:
  send:
    api:
      url: https://graph.facebook.com
      version: v7.0
  erms:
    not:
      file:
        message: 이미지, 동영상은 첨부할 수 없습니다
      audio:
        message: 음성 메시지는 전송 할 수 없습니다.
  chatbot:
    not:
      file:
        message: FACEBOOK 파일 메시지 지원 가이드
      audio:
        message: FACEBOOK 음성 메시지 지원 가이드

# ===============================
# =SamsungRCS Chatbot I/F Info
# ===============================
#삼성RCS 토큰 갱신 주기 120분 : client_credentials 115 이후 갱신, refresh_token 115 -10 분전 갱신
#삼성RCS 메이지전송 Connection Out 20초
#삼성RCS 메이지전송 Read Out 20초
#삼성RCS ExternalUrl 제외 이미지 확장자
#삼성 RCS 파일 메시지 지원 유무
#삼성 RCS 파일메시지 지원하지 않을경우 의도
#삼성 RCS 음성 메시지 지원 유무
#삼성 RCS 음성 지원하지 않을경우 의도
samsung:
  rcs:
    erms:
      not:
        file:
          message: 이미지, 동영상은 첨부할 수 없습니다
        audio:
          message: 음성 메시지는 전송 할 수 없습니다.
    chatbot:
      token: <REDACTED>
      minutes: 115
      minus-minutes: 10
      domain: https://api.maapconnect.com
      o:
        auth:
          token: <REDACTED>
            uri: /oauth2/v1/token
      send:
        connect:
          timeout: 20000
        read:
          timeout: 20000
      start:
        send:
          welcome:
            message: true
      not:
        external:
          url:
            extension: bmp,rle,dib,gif,dcm,dc3,dic,eps,iff,tdi,jpg,jpeg,jpe,jpf,jpx,jp2,jc2c,j2k,jpc,pcx,raw,pxr,png
        file:
          message: RCS 파일 메시지 지원 가이드
        audio:
          message: RCS 음성 메시지 지원 가이드
      file:
        message: false
      audio:
        message: false
#        id: EXT0000000009179
#        secret: OSY4O82uiIwdliOh4eSufjGCrMr8IpZYJzDSh1dv760
#      verification:
#$        token: i232iaeI_MBJc275KpqCLHBQnrrS_4uCdP5wqufdxOQ
#      domain: https://api.maapconnect.com

# ===============================
# = Elasticsearch Property
# ===============================

elasticsearch:
  clustername: meritz-es
  host1: localhost
  host2: localhost
  host3: localhost
  port: 9200
  scheme: http

# ===============================
# = RSA PrivateKey Property
# ===============================
rsa:
  privateKey: <REDACTED>

# ===============================
# = Chat Engine Property
# ===============================
chatengine:
  url: http://localhost:8180
  startApi: /start
  talkApi: /talk

session:
  prefix: gw1

adapter:
  tb:
    url: http://10.217.69.132
  prod:
    url: https://api.aigw.kt.co.kr

cipher:
  key : <REDACTED>
~~~

### `gateway\src\main\resources-local\application.yml`

~~~text
server:
  port: 8081

spring:
  profiles:
    include: core
    active: local
  devtools:
    livereload:
      enabled: false
  servlet:
    multipart:
      max-file-size: 100MB

engine:
  api:
    url: http://localhost:8180

erms:
  api:
    url: http://10.217.69.113:80

web:
  api:
    url: https://test.ibot.kt.com
  client:
    url: http://local.ibot.kt.com:8800/client

elastic:
  api:
    url: http://10.217.69.110:9200

# ===============================
# = Kakao Chatbot I/F Info
# ===============================
kakao:
  bot-id: bot-id
  api-key: api-key
  spectra:
    api:
      url: https://kakao-apis.enomix.co.kr
    not:
      file:
        message: 이미지, 동영상은 첨부할 수 없습니다.
      audio:
        message: 음성 메시지는 전송 할 수 없습니다.
  channel:
    open:
      url: https://bizmessage.kakao.com
  event:
    api:
      url: https://bot-api.kakao.com
  chatbot:
    not:
      file:
        message: KAKAO 파일 메시지 지원 가이드

# ===============================
# = Facebook Chatbot I/F Info
# ===============================
facebook:
  send:
    api:
      url: https://graph.facebook.com
      version: v7.0
  erms:
    not:
      file:
        message: 이미지, 동영상은 첨부할 수 없습니다
      audio:
        message: 음성 메시지는 전송 할 수 없습니다.
  chatbot:
    not:
      file:
        message: FACEBOOK 파일 메시지 지원 가이드
      audio:
        message: FACEBOOK 음성 메시지 지원 가이드
# ===============================
# = SamsungRCS Chatbot I/F Info
# ===============================
#삼성RCS 토큰 갱신 주기 120분 : client_credentials 115 이후 갱신, refresh_token 115 -10 분전 갱신
#삼성RCS 메이지전송 Connection Out 20초
#삼성RCS 메이지전송 Read Out 20초
#삼성RCS ExternalUrl 제외 이미지 확장자
#삼성 RCS 파일 메시지 지원 유무
#삼성 RCS 파일메시지 지원하지 않을경우 의도
#삼성 RCS 음성 메시지 지원 유무
#삼성 RCS 음성 지원하지 않을경우 의도
samsung:
  rcs:
    erms:
      not:
        file:
          message: 이미지, 동영상은 첨부할 수 없습니다
        audio:
          message: 음성 메시지는 전송 할 수 없습니다.
    chatbot:
      token: <REDACTED>
      minutes: 115
      minus-minutes: 10
      domain: https://api.maapconnect.com
      o:
        auth:
          token: <REDACTED>
            uri: /oauth2/v1/token
      send:
        connect:
          timeout: 20000
        read:
          timeout: 20000
      start:
        send:
          welcome:
            message: true
      not:
        external:
          url:
            extension: bmp,rle,dib,gif,dcm,dc3,dic,eps,iff,tdi,jpg,jpeg,jpe,jpf,jpx,jp2,jc2c,j2k,jpc,pcx,raw,pxr,png
        file:
          message: RCS 파일 메시지 지원 가이드
        audio:
          message: RCS 음성 메시지 지원 가이드
      file:
        message: false
      audio:
        message: false

# ===============================
# = Elasticsearch Property
# ===============================

elasticsearch:
  clustername: aicc-es
  host1: 10.217.69.110
  host2: 10.217.69.130
  host3: 10.217.69.99
  port: 9200
  scheme: http

# ===============================
# = RSA PrivateKey Property
# ===============================
rsa:
  privateKey: <REDACTED>

# ===============================
# = Chat Engine Property
# ===============================
chatengine:
  url: http://localhost:8180
  startApi: /start
  talkApi: /talk

session:
  prefix: gw1

adapter:
  tb:
    url: http://10.217.69.132
  prod:
    url: http://10.217.69.132

cipher:
  key : <REDACTED>
~~~

### `gateway\src\main\resources-prod\application.yml`

~~~text
server:
  port: 8180

logging:
  config: classpath:logging-config.xml

spring:
  profiles:
    include: core
  devtools:
    livereload:
      enabled: false
  servlet:
    multipart:
      max-file-size: 100MB

engine:
  api:
    url: http://localhost:8280

# 일단 패스
erms:
  api:
    url: http://10.220.194.90

web:
  api:
    url: http://10.213.177.159:1080
  client:
    url: http://10.213.177.159/client

elastic:
  api:
    url: http://localhost:9200

# ===============================
# = Kakao Chatbot I/F Info
# ===============================
kakao:
  spectra:
    api:
      url: https://kakao-apis.enomix.co.kr
    not:
      file:
        message: 이미지, 동영상은 첨부할 수 없습니다.
      audio:
        message: 음성 메시지는 전송 할 수 없습니다.
  channel:
    open:
      url: https://bizmessage.kakao.com
  chatbot:
    not:
      file:
        message: KAKAO 파일 메시지 지원 가이드

# ===============================
# = Facebook Chatbot I/F Info
# ===============================
facebook:
  send:
    api:
      url: https://graph.facebook.com
      version: v7.0
  erms:
    not:
      file:
        message: 이미지, 동영상은 첨부할 수 없습니다
      audio:
        message: 음성 메시지는 전송 할 수 없습니다.
  chatbot:
    not:
      file:
        message: FACEBOOK 파일 메시지 지원 가이드
      audio:
        message: FACEBOOK 음성 메시지 지원 가이드

# ===============================
# =SamsungRCS Chatbot I/F Info
# ===============================
#삼성RCS 토큰 갱신 주기 120분 : client_credentials 115 이후 갱신, refresh_token 115 -10 분전 갱신
#삼성RCS 메이지전송 Connection Out 20초
#삼성RCS 메이지전송 Read Out 20초
#삼성RCS ExternalUrl 제외 이미지 확장자
#삼성 RCS 파일 메시지 지원 유무
#삼성 RCS 파일메시지 지원하지 않을경우 의도
#삼성 RCS 음성 메시지 지원 유무
#삼성 RCS 음성 지원하지 않을경우 의도
samsung:
  rcs:
    erms:
      not:
        file:
          message: 이미지, 동영상은 첨부할 수 없습니다
        audio:
          message: 음성 메시지는 전송 할 수 없습니다.
    chatbot:
      token: <REDACTED>
      minutes: 115
      minus-minutes: 10
      domain: https://api.maapconnect.com
      o:
        auth:
          token: <REDACTED>
            uri: /oauth2/v1/token
      send:
        connect:
          timeout: 20000
        read:
          timeout: 20000
      start:
        send:
          welcome:
            message: true
      not:
        external:
          url:
            extension: bmp,rle,dib,gif,dcm,dc3,dic,eps,iff,tdi,jpg,jpeg,jpe,jpf,jpx,jp2,jc2c,j2k,jpc,pcx,raw,pxr,png
        file:
          message: RCS 파일 메시지 지원 가이드
        audio:
          message: RCS 음성 메시지 지원 가이드
      file:
        message: false
      audio:
        message: false
#        id: EXT0000000009179
#        secret: OSY4O82uiIwdliOh4eSufjGCrMr8IpZYJzDSh1dv760
#      verification:
#$        token: i232iaeI_MBJc275KpqCLHBQnrrS_4uCdP5wqufdxOQ
#      domain: https://api.maapconnect.com

# ===============================
# = Elasticsearch Property
# ===============================

elasticsearch:
  clustername: meritz-es
  host1: localhost
  host2: localhost
  host3: localhost
  port: 9200
  scheme: http

# ===============================
# = RSA PrivateKey Property
# ===============================
rsa:
  privateKey: <REDACTED>

# ===============================
# = Chat Engine Property
# ===============================
chatengine:
  url: http://localhost:8280
  startApi: /start
  talkApi: /talk

session:
  prefix: gw1

adapter:
  tb:
    url: http://10.217.69.132
  prod:
    url: https://api.aigw.kt.co.kr

cipher:
  key : <REDACTED>
~~~

### `master\Dockerfile`

~~~text
FROM amazoncorretto:8-alpine-jre AS run

ARG PROFILE=dev
ENV SPRING_PROFILES_ACTIVE=${PROFILE}

RUN addgroup -S app && adduser -S app -G app
USER app

WORKDIR /app

ARG JAR_FILE=app.jar
COPY ${JAR_FILE} /app/app.jar

EXPOSE 8480
ENTRYPOINT ["java", "-Xms256m", "-Xmx2048m", "-jar", "/app/app.jar"]
~~~

### `master\pom.xml`

~~~text
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <parent>
        <groupId>com.kt.aicc</groupId>
        <version>0.0.1-SNAPSHOT</version>
        <artifactId>ktbot</artifactId>
    </parent>
    <modelVersion>4.0.0</modelVersion>

    <artifactId>master</artifactId>
    <version>0.0.1-SNAPSHOT</version>
    <packaging>jar</packaging>

    <dependencies>
        <dependency>
            <groupId>com.kt.aicc</groupId>
            <artifactId>persistence</artifactId>
            <version>${project.version}</version>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-undertow</artifactId>
            <scope>provided</scope>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
            <exclusions>
                <exclusion>
                    <groupId>org.springframework.boot</groupId>
                    <artifactId>spring-boot-starter-tomcat</artifactId>
                </exclusion>
            </exclusions>
        </dependency>

        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-thymeleaf</artifactId>
            <exclusions>
                <exclusion>
                    <groupId>org.springframework.boot</groupId>
                    <artifactId>spring-boot-starter-tomcat</artifactId>
                </exclusion>
            </exclusions>
        </dependency>

        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-cache</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-security</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.batch</groupId>
            <artifactId>spring-batch-core</artifactId>
        </dependency>
        <dependency>
            <groupId>org.ehcache</groupId>
            <artifactId>ehcache</artifactId>
            <version>${ehcache.version}</version>
        </dependency>
        <dependency>
            <groupId>javax.cache</groupId>
            <artifactId>cache-api</artifactId>
            <version>${cacheApi.version}</version>
        </dependency>
        <dependency>
            <groupId>org.apache.poi</groupId>
            <artifactId>ooxml-schemas</artifactId>
            <version>${apachePoiOoxmlSchema.version}</version>
        </dependency>
        <dependency>
            <groupId>nl.captcha</groupId>
            <artifactId>simplecaptcha</artifactId>
            <version>1.2.1</version>
            <scope>system</scope>
            <systemPath>${project.basedir}/../libs/simplecaptcha-1.2.1.jar</systemPath>
        </dependency>

        <dependency>
            <groupId>org.thymeleaf.extras</groupId>
            <artifactId>thymeleaf-extras-springsecurity5</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.session</groupId>
            <artifactId>spring-session-data-redis</artifactId>
        </dependency>
<!--        <dependency>-->
<!--            <groupId>org.liquibase</groupId>-->
<!--            <artifactId>liquibase-core</artifactId>-->
<!--            <version>${liquibase.version}</version>-->
<!--        </dependency>-->
        <dependency>
            <groupId>com.google.guava</groupId>
            <artifactId>guava</artifactId>
            <version>${guava.version}</version>
        </dependency>

        <dependency>
            <groupId>junit</groupId>
            <artifactId>junit</artifactId>
            <version>4.12</version>
            <scope>test</scope>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
            </plugin>
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-compiler-plugin</artifactId>
                <version>3.1</version>
                <configuration>
                    <source>${java.version}</source>
                    <target>${java.version}</target>
                </configuration>
            </plugin>
        </plugins>
    </build>
</project>
~~~

### `master\src\main\resources\application.yml`

~~~text
#server:
#  port: 8380
#
#logging:
#  config: classpath:logging-config.xml
#
#spring:
#  profiles:
#    include: core
#  ## redis session
#  session:
#    store-type: redis
#  redis:
#    cluster:
#      nodes: redis1:7000,redis2:7001,redis3:7002
#  # file size
#  servlet:
#    multipart:
#      max-request-size: 256MB
#      max-file-size: 256MB
#  main:
#    allow-bean-definition-overriding: true
#  datasource:
#    platform: postgres
#    url: jdbc:postgresql://10.213.177.14:5444/aicc_chatdb
#    username: master
#    password: ENC(vcKUHMzNLZW46QXNFd1iEz6yoIx2HdcptPpgkC8bbvs=)
#    driver-class-name: org.postgresql.Driver
#    type: com.zaxxer.hikari.HikariDataSource
#    hikari:
#      maximum-pool-size: 100
#      minimum-idle: 20
#      connection-timeout: 30000
#      idle-timeout: 60000
#      max-lifetime: 300000
#
#  jpa:
#    database: POSTGRESQL
#    database-platform: org.hibernate.dialect.PostgreSQL95Dialect
#    open-in-view: true
#    show-sql: false
#    generate-ddl: true
#    hibernate:
#      ddl-auto: update
#      #ddl-auto: create-drop
#
#  mvc:
#    contentnegotiation:
#      favor-parameter: true
#      favor-path-extension: true
#      midia-types:
#        xls: application/vnd.ms-excel
#cms:
#  rive:
#    dir: /data/upload/rive
#  upload:
#    dir: /meritz_data/images
#  check:
#    access:
#      remoteIp: false
#    captcha: true
#  ldap:
#    port: 636
#    base-dn: OU=Employee,DC=ldap,DC=ktlab,DC=dev
#    service:
#      id: aicc_ldapdevuser
#      password: ENC(MclP7kgNXDzngv+/kqcrFj8CZciY563FzqhgyAOaLM42MA8dX8J6tzD+4zXcwPY1)
#    active: false
#    host: https://int-in.api.kt.com/ldap
#    version: /v2.0
#    key: ljwojPWxX2BjyskV6bhlwQsj23mis1ws
#    accounts:
#      cp-id: AII3600055158MOSGVX
#      cp-pw: SVK3600055158CJIXPR
#      connId: ktaicc_ldapuser
#      connPwd: kt@iCC_Ld@pU5er!
#  # G-Cloud일 경우 회원가입,ip변경 화면 삭제
#  sign-up-active: false
#bot:
#  content:
#    base-path: /data/bot
#    rive-path: /data/bot/rive
#
#script:
#  solr:
#    backup: ${user.home}/script/solrBackup.sh
#engine:
#  servers:
#    - http://localhost:8280
#adapter:
#  tb:
#    url: http://10.217.69.132
#  prod:
#    url: https://api.aigw.kt.co.kr
#
#content:
#  resourceLocation: https://chatbot.kt-aicc.com/images
#
#elasticsearch:
#  clustername: meritz-es
#  host1: localhost
#  host2: localhost
#  host3: localhost
#  port: 9200
#  scheme: http
#  index: chatbot_b2b_log*
#  server: prod
#
#client:
#  simulator-prefix: http://localhost:8080
#  simulator-url: /client/STANDBY/simulator.html
#
#batch:
#  url: http://localhost:8580
#
#header:
#  x-auth-key: ZWFzeUNNU19JL0ZfQVBJ
#  x-master-auth-key: GHFzeUBQU88JL0ZfLKOVV
#
#
#sms:
#  division: prod
#
#cipher:
#  key : KT_EASY_CMS_CHAT
#lamp:
#  service-code: CO007701
#
#jasypt:
#  encryptor:
#    bean: encryptorBean
#    pkey: SYgwO1juM
#
#project:
#  name: master
#
#master:
#  api:
#    url: http://localhost:8380
~~~

### `master\src\main\resources\application-dev.yml`

~~~text
server:
  port: 8380

logging:
  config: classpath:logging-dev-config.xml

spring:
  profiles:
    include: core-dev
  ## redis session
  session:
    store-type: redis
  redis:
    cluster:
      nodes: redis1:7000,redis2:7001,redis3:7002
  # file size
  servlet:
    multipart:
      max-request-size: 256MB
      max-file-size: 256MB
  main:
    lazy-initialization: true
    allow-bean-definition-overriding: true
  datasource:
    platform: mariadb
    url: jdbc:mariadb://10.92.89.119:13306/meritz_db?characterEncoding=UTF-8&serverTimezone=UTC
    username: vbmardb
    password: <REDACTED>
    driver-class-name: org.mariadb.jdbc.Driver
    type: com.zaxxer.hikari.HikariDataSource
    hikari:
      maximum-pool-size: 100
      minimum-idle: 20
      connection-timeout: 30000
      idle-timeout: 60000
      max-lifetime: 300000

  jpa:
    database: mysql
    open-in-view: true
    show-sql: false
    generate-ddl: true
    hibernate:
      ddl-auto: none

  mvc:
    contentnegotiation:
      favor-parameter: true
      favor-path-extension: true
      midia-types:
        xls: application/vnd.ms-excel
cms:
  rive:
    dir: /application/cms/data/upload/rive
  upload:
    dir: /application/cms/meritz_data/images
  check:
    access:
      remoteIp: false
    captcha: false
  ldap:
    port: 636
    base-dn: OU=Employee,DC=ldap,DC=ktlab,DC=dev
    service:
      id: aicc_ldapdevuser
      password: <REDACTED>
    active: false
    host: https://int-in.api.kt.com/ldap
    version: /v2.0
    key: <REDACTED>
    accounts:
      cp-id: AII3600055158MOSGVX
      cp-pw: SVK3600055158CJIXPR
      connId: ktaicc_ldapuser
      connPwd: <REDACTED>
  # G-Cloud일 경우 회원가입,ip변경 화면 삭제
  sign-up-active: false
  default-pw: Meritz!@34
bot:
  content:
    base-path: /application/cms/data/bot
    rive-path: /application/cms/data/bot/rive

script:
  solr:
    backup: ${user.home}/script/solrBackup.sh
engine:
  servers:
    - http://localhost:8180
adapter:
  tb:
    url: http://10.217.69.132
  prod:
    url: https://api.aigw.kt.co.kr

content:
  resourceLocation: http://localhost:8480/images

elasticsearch:
  clustername: meritz-es
  host1: localhost
  host2: localhost
  host3: localhost
  port: 9200
  scheme: http
  index: chatbot_b2b_log*
  server: dev

client:
  simulator-prefix: http://localhost:8480
  simulator-url: /client/STANDBY/simulator.html

batch:
  url: http://localhost:8580

header:
  x-auth-key: ZWFzeUNNU19JL0ZfQVBJ
  x-master-auth-key: GHFzeUBQU88JL0ZfLKOVV


sms:
  division: dev

cipher:
  key : <REDACTED>
lamp:
  service-code: CO007701

jasypt:
  encryptor:
    bean: encryptorBean
    pkey: SYgwO1juM

project:
  name: master

master:
  api:
    url: http://localhost:8380
~~~

### `master\src\main\resources\application-dev-tb.yml`

~~~text
server:
  port: 8380

logging:
  config: classpath:logging-local-config.xml

spring:
  profiles:
    include: core-dev-tb
  ## redis session
  session:
    store-type: redis
  redis:
    cluster:
      nodes: 127.0.0.1:6379,127.0.0.1:6379
  # file size
  servlet:
    multipart:
      max-request-size: 256MB
      max-file-size: 256MB
  main:
    allow-bean-definition-overriding: true
  datasource:
    platform: mariadb
    url: jdbc:mariadb://localhost:13306/meritz
    username: meritz
    password: <REDACTED>
    driver-class-name: org.mariadb.jdbc.Driver
    type: com.zaxxer.hikari.HikariDataSource
    hikari:
      maximum-pool-size: 100
      minimum-idle: 20
      connection-timeout: 30000
      idle-timeout: 60000
      max-lifetime: 300000

  jpa:
    database: mysql
    open-in-view: true
    show-sql: false
    generate-ddl: true
    hibernate:
      ddl-auto: update
#  datasource:
#    platform: postgres
#    url: jdbc:postgresql://127.0.0.1:5432/meritz
#    username: meritz
#    password: passw0rd
#    driver-class-name: org.postgresql.Driver
#    type: com.zaxxer.hikari.HikariDataSource
#    hikari:
#      maximum-pool-size: 100
#      minimum-idle: 20
#      connection-timeout: 30000
#      idle-timeout: 60000
#      max-lifetime: 300000
#
#  jpa:
#    database: POSTGRESQL
#    database-platform: org.hibernate.dialect.PostgreSQL95Dialect
#    open-in-view: true
#    show-sql: false
#    generate-ddl: true
#    hibernate:
#      ddl-auto: update
      #ddl-auto: create-drop

  mvc:
    contentnegotiation:
      favor-parameter: true
      favor-path-extension: true
      midia-types:
        xls: application/vnd.ms-excel
cms:
  rive:
    dir: /data/upload/rive
  upload:
    dir: /meritz_data/images
  check:
    access:
      remoteIp: false
    captcha: false
  ldap:
    port: 636
    base-dn: OU=Employee,DC=ldap,DC=ktlab,DC=dev
    service:
      id: aicc_ldapdevuser
      password: <REDACTED>
    active: false
    host: https://int-in.api.kt.com/ldap
    version: /v2.0
    key: <REDACTED>
    accounts:
      cp-id: AII3600055158MOSGVX
      cp-pw: SVK3600055158CJIXPR
      connId: ktaicc_ldapuser
      connPwd: <REDACTED>
  # G-Cloud일 경우 회원가입,ip변경 화면 삭제
  sign-up-active: false
  default-pw: Meritz!@34
bot:
  content:
    base-path: /data/bot
    rive-path: /data/bot/rive

script:
  solr:
    backup: ${user.home}/script/solrBackup.sh
engine:
  servers:
    - http://localhost:8280
adapter:
  tb:
    url: http://10.217.69.132
  prod:
    url: https://api.aigw.kt.co.kr

content:
  resourceLocation: https://chatbot.kt-aicc.com/images

elasticsearch:
  clustername: meritz-es
  host1: localhost
  host2: localhost
  host3: localhost
  port: 9200
  scheme: http
  index: chatbot_b2b_log*
  server: dev

client:
  simulator-prefix: http://localhost:8480
  simulator-url: /client/STANDBY/simulator.html

batch:
  url: http://localhost:8580

header:
  x-auth-key: ZWFzeUNNU19JL0ZfQVBJ
  x-master-auth-key: GHFzeUBQU88JL0ZfLKOVV


sms:
  division: dev

cipher:
  key : <REDACTED>
lamp:
  service-code: CO007701

jasypt:
  encryptor:
    bean: encryptorBean
    pkey: SYgwO1juM

project:
  name: master

master:
  api:
    url: http://localhost:8380
~~~

### `master\src\main\resources\application-han.yml`

~~~text
server:
  port: 8380

logging:
  config: classpath:logging-local-config.xml


spring:
  profiles:
    include: core-local
    active: han
  ## redis session
  session:
    store-type: redis
  redis:
    cluster:
      nodes: 127.0.0.1:6379,127.0.0.1:6379
  # file size
  servlet:
    multipart:
      max-request-size: 256MB
      max-file-size: 256MB
  main:
    allow-bean-definition-overriding: true
  datasource:
    platform: mariadb
    url: jdbc:mariadb://localhost:13306/han
    username: han
    password: <REDACTED>
    driver-class-name: org.mariadb.jdbc.Driver
    type: com.zaxxer.hikari.HikariDataSource
    hikari:
      maximum-pool-size: 100
      minimum-idle: 20
      connection-timeout: 30000
      idle-timeout: 60000
      max-lifetime: 300000

  jpa:
    database: mysql
    open-in-view: true
    show-sql: false
    generate-ddl: true
    hibernate:
      ddl-auto: none
#      ddl-auto: update
#  datasource:
#    platform: postgres
#    url: jdbc:postgresql://127.0.0.1:5432/meritz
#    username: meritz
#    password: passw0rd
#    driver-class-name: org.postgresql.Driver
#    type: com.zaxxer.hikari.HikariDataSource
#    hikari:
#      maximum-pool-size: 100
#      minimum-idle: 20
#      connection-timeout: 30000
#      idle-timeout: 60000
#      max-lifetime: 300000
#
#  jpa:
#    database: POSTGRESQL
#    database-platform: org.hibernate.dialect.PostgreSQL95Dialect
#    open-in-view: true
#    show-sql: false
#    generate-ddl: true
#    hibernate:
#      ddl-auto: update
      #ddl-auto: create-drop

  mvc:
    contentnegotiation:
      favor-parameter: true
      favor-path-extension: true
      midia-types:
        xls: application/vnd.ms-excel
cms:
  rive:
    dir: /data/upload/rive
  upload:
    dir: /meritz_data/images
  check:
    access:
      remoteIp: false
    captcha: true
  ldap:
    port: 636
    base-dn: OU=Employee,DC=ldap,DC=ktlab,DC=dev
    service:
      id: aicc_ldapdevuser
      password: <REDACTED>
    active: false
    host: https://int-in.api.kt.com/ldap
    version: /v2.0
    key: <REDACTED>
    accounts:
      cp-id: AII3600055158MOSGVX
      cp-pw: SVK3600055158CJIXPR
      connId: ktaicc_ldapuser
      connPwd: <REDACTED>
  # G-Cloud일 경우 회원가입,ip변경 화면 삭제
  sign-up-active: false
bot:
  content:
    base-path: /data/bot
    rive-path: /data/bot/rive

script:
  solr:
    backup: ${user.home}/script/solrBackup.sh
engine:
  servers:
    - http://engine:8180
adapter:
  tb:
    url: http://10.217.69.132
  prod:
    url: https://api.aigw.kt.co.kr

content:
  resourceLocation: https://chatbot.kt-aicc.com/images

elasticsearch:
  clustername: meritz-es
  host1: localhost
  host2: localhost
  host3: localhost
  port: 9200
  scheme: http
  index: chatbot_b2b_log*
  server: dev

client:
  simulator-prefix: http://localhost:8480
  simulator-url: /client/STANDBY/simulator.html

batch:
  url: http://localhost:8580

header:
  x-auth-key: ZWFzeUNNU19JL0ZfQVBJ
  x-master-auth-key: GHFzeUBQU88JL0ZfLKOVV


sms:
  division: dev

cipher:
  key : <REDACTED>
lamp:
  service-code: CO007701

jasypt:
  encryptor:
    bean: encryptorBean
    pkey: SYgwO1juM

project:
  name: master

master:
  api:
    url: http://localhost:8380
~~~

### `master\src\main\resources\application-prod.yml`

~~~text
server:
  port: 8380

logging:
  config: classpath:logging-prod-config.xml

spring:
  profiles:
    include: core-prod
  ## redis session
  session:
    store-type: redis
  redis:
    cluster:
      nodes: redis1:7000,redis2:7000,redis3:7000
  # file size
  servlet:
    multipart:
      max-request-size: 256MB
      max-file-size: 256MB
  main:
    lazy-initialization: true
    allow-bean-definition-overriding: true
  datasource:
    platform: mariadb
    url: jdbc:mariadb://10.92.20.202:13306/meritz_db?characterEncoding=UTF-8&serverTimezone=UTC
    username: vbmardb
    password: <REDACTED>
    driver-class-name: org.mariadb.jdbc.Driver
    type: com.zaxxer.hikari.HikariDataSource
    hikari:
      maximum-pool-size: 100
      minimum-idle: 20
      connection-timeout: 30000
      idle-timeout: 60000
      max-lifetime: 300000

  jpa:
    database: mysql
    open-in-view: true
    show-sql: false
    generate-ddl: true
    hibernate:
      ddl-auto: update

  mvc:
    contentnegotiation:
      favor-parameter: true
      favor-path-extension: true
      midia-types:
        xls: application/vnd.ms-excel
cms:
  rive:
    dir: /application/cms/data/upload/rive
  upload:
    dir: /application/cms/meritz_data/images
  check:
    access:
      remoteIp: false
    captcha: false
  ldap:
    port: 636
    base-dn: OU=Employee,DC=ldap,DC=ktlab,DC=dev
    service:
      id: aicc_ldapdevuser
      password: <REDACTED>
    active: false
    host: https://int-in.api.kt.com/ldap
    version: /v2.0
    key: <REDACTED>
    accounts:
      cp-id: AII3600055158MOSGVX
      cp-pw: SVK3600055158CJIXPR
      connId: ktaicc_ldapuser
      connPwd: <REDACTED>
  # G-Cloud일 경우 회원가입,ip변경 화면 삭제
  sign-up-active: false
  default-pw: Meritz!@34
bot:
  content:
    base-path: /application/cms/data/bot
    rive-path: /application/cms/data/bot/rive

script:
  solr:
    backup: ${user.home}/script/solrBackup.sh
engine:
  servers:
    - http://10.92.30.79:8180
    - http://10.92.30.80:8180
    - http://10.92.30.81:8180
adapter:
  tb:
    url: http://10.217.69.132
  prod:
    url: https://api.aigw.kt.co.kr

content:
  resourceLocation: http://localhost:8480/images

elasticsearch:
  clustername: meritz-es
  host1: es1
  host2: es2
  host3: es3
  port: 9200
  scheme: http
  index: chatbot_b2b_log*
  server: prod

client:
  simulator-prefix: http://10.20.30.243:8480
  simulator-url: /client/STANDBY/simulator.html

batch:
  url: http://10.20.30.243:8580

header:
  x-auth-key: ZWFzeUNNU19JL0ZfQVBJ
  x-master-auth-key: GHFzeUBQU88JL0ZfLKOVV


sms:
  division: prod

cipher:
  key : <REDACTED>
lamp:
  service-code: CO007701

jasypt:
  encryptor:
    bean: encryptorBean
    pkey: SYgwO1juM

project:
  name: master

master:
  api:
    url: http://10.20.30.243:8380
~~~

### `master\src\main\resources\application-tc.yml`

~~~text
server:
  port: 8380

logging:
  config: classpath:logging-tc-config.xml

spring:
  profiles:
    include: core-tc
  ## redis session
  session:
    store-type: redis
  redis:
    cluster:
      nodes: redis1:7000,redis2:7000,redis3:7000
  # file size
  servlet:
    multipart:
      max-request-size: 256MB
      max-file-size: 256MB
  main:
    lazy-initialization: false
    allow-bean-definition-overriding: true
  datasource:
    platform: mariadb
    url: jdbc:mariadb://mariadb1:13306/meritz_easycms?characterEncoding=UTF-8&serverTimezone=UTC
    username: meritz_easycms
    password: <REDACTED>
    driver-class-name: org.mariadb.jdbc.Driver
    type: com.zaxxer.hikari.HikariDataSource
    hikari:
      maximum-pool-size: 15
      minimum-idle: 15
      connection-timeout: 30000
      idle-timeout: 60000
      max-lifetime: 300000

  jpa:
    database: mysql
    open-in-view: true
    show-sql: true
    generate-ddl: true
    hibernate:
      ddl-auto: update

  mvc:
    contentnegotiation:
      favor-parameter: true
      favor-path-extension: true
      midia-types:
        xls: application/vnd.ms-excel
cms:
  rive:
    dir: /application/cms/data/upload/rive
  upload:
    dir: /application/cms/meritz_data/images
  check:
    access:
      remoteIp: false
    captcha: true
  ldap:
    port: 636
    base-dn: OU=Employee,DC=ldap,DC=ktlab,DC=dev
    service:
      id: aicc_ldapdevuser
      password: <REDACTED>
    active: false
    host: https://int-in.api.kt.com/ldap
    version: /v2.0
    key: <REDACTED>
    accounts:
      cp-id: AII3600055158MOSGVX
      cp-pw: SVK3600055158CJIXPR
      connId: ktaicc_ldapuser
      connPwd: <REDACTED>
  # G-Cloud일 경우 회원가입,ip변경 화면 삭제
  sign-up-active: false
  default-pw: Meritz!@34
bot:
  content:
    base-path: /application/cms/data/bot
    rive-path: /application/cms/data/bot/rive

script:
  solr:
    backup: ${user.home}/script/solrBackup.sh
engine:
  servers:
    - http://engine1:8180
    - http://engine2:8180
    - http://engine3:8180
adapter:
  tb:
    url: http://10.217.69.132
  prod:
    url: https://api.aigw.kt.co.kr

content:
  resourceLocation: http://localhost:8480/images

elasticsearch:
  clustername: meritz-es
  host1: es1
  host2: es2
  host3: es3
  port: 9200
  scheme: http
  index: chatbot_b2b_log*
  server: dev

client:
  simulator-prefix: http://chat-ui1:8480
  simulator-url: /client/STANDBY/simulator.html

batch:
  url: http://scheduler1:8580

header:
  x-auth-key: ZWFzeUNNU19JL0ZfQVBJ
  x-master-auth-key: GHFzeUBQU88JL0ZfLKOVV


sms:
  division: dev

cipher:
  key : <REDACTED>
lamp:
  service-code: CO007701

jasypt:
  encryptor:
    bean: encryptorBean
    pkey: SYgwO1juM

project:
  name: master

master:
  api:
    url: http://master:8380
management:
  health:
    elasticsearch:
      enabled: false
~~~

### `persistence\pom.xml`

~~~text
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <parent>
        <groupId>com.kt.aicc</groupId>
        <version>0.0.1-SNAPSHOT</version>
        <artifactId>ktbot</artifactId>
    </parent>
    <modelVersion>4.0.0</modelVersion>

    <artifactId>persistence</artifactId>
    <version>0.0.1-SNAPSHOT</version>
    <packaging>jar</packaging>

    <dependencies>
        <dependency>
            <groupId>com.kt.aicc</groupId>
            <artifactId>common</artifactId>
            <version>${project.version}</version>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-validation</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-data-jpa</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-jdbc</artifactId>
        </dependency>
        <dependency>
            <groupId>org.mybatis.spring.boot</groupId>
            <artifactId>mybatis-spring-boot-starter</artifactId>
            <version>2.1.3</version>
        </dependency>
        <dependency>
            <groupId>org.mybatis</groupId>
            <artifactId>mybatis-spring</artifactId>
            <version>2.0.5</version>
        </dependency>
        <dependency>
            <groupId>org.mybatis</groupId>
            <artifactId>mybatis</artifactId>
            <version>3.5.5</version>
        </dependency>
        <dependency>
            <groupId>org.json</groupId>
            <artifactId>json</artifactId>
            <version>20160810</version>
        </dependency>

        <dependency>
            <groupId>junit</groupId>
            <artifactId>junit</artifactId>
            <version>4.12</version>
            <scope>test</scope>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
                <configuration>
                    <skip>true</skip>
                </configuration>
            </plugin>
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-compiler-plugin</artifactId>
                <version>3.1</version>
                <configuration>
                    <source>${java.version}</source>
                    <target>${java.version}</target>
                </configuration>
            </plugin>
        </plugins>
    </build>
</project>
~~~

### `persistence\src\main\resources\application.yml`

~~~text
#chatbot:
#  test: DEFAULT
#spring:
#  main:
#    allow-bean-definition-overriding: true
#  datasource:
#    platform: postgres
#    url:  jdbc:postgresql://localhost:5432/ktalk
#    username: postgres
#    password: admin
#    driver-class-name:  org.postgresql.Driver
#    type: com.zaxxer.hikari.HikariDataSource
#    hikari:
#      maximum-pool-size:  100
#      minimum-idle: 50
#      connection-timeout: 30000
#      idle-timeout: 60000
#      max-lifetime: 300000
#  jpa:
#    show-sql:  true
#    generate-ddl : true
#    hibernate:
#      ddl-auto: update
#      naming-strategy:  org.hibernate.cfg.ImprovedNamingStrategy
#    properties:
#      hibernate:
#        format_sql: true
#        show_sql: true
~~~

### `pom.xml`

~~~text
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
		 xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
	<modelVersion>4.0.0</modelVersion>
	<modules>
		<module>common</module>
		<module>persistence</module>
		<module>cms</module>
		<module>engine</module>
		<module>gateway</module>
		<module>chat-ui</module>
		<module>scheduler</module>
		<module>master</module>
	</modules>
	<parent>
		<groupId>org.springframework.boot</groupId>
		<artifactId>spring-boot-starter-parent</artifactId>
		<version>2.3.0.RELEASE</version>
	</parent>

	<groupId>com.kt.aicc</groupId>
	<artifactId>ktbot</artifactId>
	<version>0.0.1-SNAPSHOT</version>
	<name>ktbot</name>
	<description>ktbot</description>
	<packaging>pom</packaging>

	<properties>
		<java.version>1.8</java.version>
		<spring-websocket.version>5.2.8.RELEASE</spring-websocket.version>
		<websocket-api.version>1.1</websocket-api.version>
		<commonsLang.version>3.10</commonsLang.version>
		<commonsText.version>1.9</commonsText.version>
		<commonsCollection.version>4.4</commonsCollection.version>
		<commonsFileupload.version>1.4</commonsFileupload.version>
		<apachePoi.version>4.1.2</apachePoi.version>
		<apachePoiOoxmlSchema.version>1.4</apachePoiOoxmlSchema.version>
		<gson.version>2.8.6</gson.version>
		<jedis.version>3.3.0</jedis.version>
		<redis.version>0.7.2</redis.version>
		<jsonPath.version>2.4.0</jsonPath.version>
		<embbedRedis.version>0.7.2</embbedRedis.version>
		<reactorCore.version>3.3.0.RELEASE</reactorCore.version>
		<zk.version>3.4.11</zk.version>
		<inject.version>1</inject.version>
		<zuul.version>2.0.1.RELEASE</zuul.version>
		<ehcache.version>3.8.0</ehcache.version>
		<cacheApi.version>1.1.0</cacheApi.version>
		<logstashLogback.version>5.2</logstashLogback.version>
		<mybatisSpring.version>2.1.3</mybatisSpring.version>
		<postgresql.version>42.2.5</postgresql.version>
		<lucyXss.version>1.6.3</lucyXss.version>
		<lucyXssServlet.version>2.0.0</lucyXssServlet.version>
		<logback.version>1.2.3</logback.version>
		<es.version>7.8.0</es.version>
		<liquibase.version>4.3.5</liquibase.version>
		<guava.version>29.0-jre</guava.version>
		<quertz.version>2.3.2</quertz.version>

		<jackson.version>2.13.3</jackson.version>
		<mariadbVersion>2.7.5</mariadbVersion>

	</properties>

	<dependencies>
		<dependency>
			<groupId>org.springframework.boot</groupId>
			<artifactId>spring-boot-starter</artifactId>
		</dependency>
		<dependency>
			<groupId>org.springframework.boot</groupId>
			<artifactId>spring-boot-starter-actuator</artifactId>
			<exclusions>
				<exclusion>
					<groupId>org.springframework.boot</groupId>
					<artifactId>spring-boot-starter-logging</artifactId>
				</exclusion>
			</exclusions>
		</dependency>
		<dependency>
			<groupId>org.springframework.cloud</groupId>
			<artifactId>spring-cloud-starter-netflix-zuul</artifactId>
			<version>${zuul.version}</version>
			<exclusions>
				<exclusion>
					<groupId>org.springframework.boot</groupId>
					<artifactId>spring-boot-starter-tomcat</artifactId>
				</exclusion>
			</exclusions>
		</dependency>
		<dependency>
			<groupId>javax.servlet</groupId>
			<artifactId>servlet-api</artifactId>
			<version>2.5</version>
			<scope>provided</scope>
		</dependency>
		<dependency>
			<groupId>org.apache.commons</groupId>
			<artifactId>commons-lang3</artifactId>
			<version>${commonsLang.version}</version>
		</dependency>
		<dependency>
			<groupId>org.apache.commons</groupId>
			<artifactId>commons-text</artifactId>
			<version>${commonsText.version}</version>
		</dependency>
		<dependency>
			<groupId>org.apache.commons</groupId>
			<artifactId>commons-collections4</artifactId>
			<version>${commonsCollection.version}</version>
		</dependency>
		<dependency>
			<groupId>org.mybatis.spring.boot</groupId>
			<artifactId>mybatis-spring-boot-starter</artifactId>
			<version>${mybatisSpring.version}</version>
		</dependency>
		<dependency>
			<groupId>org.springframework.data</groupId>
			<artifactId>spring-data-redis</artifactId>
		</dependency>
		<dependency>
			<groupId>org.postgresql</groupId>
			<artifactId>postgresql</artifactId>
			<version>${postgresql.version}</version>
		</dependency>
		<dependency>
			<groupId>com.google.code.gson</groupId>
			<artifactId>gson</artifactId>
			<version>${gson.version}</version>
		</dependency>
		<dependency>
			<groupId>com.jayway.jsonpath</groupId>
			<artifactId>json-path</artifactId>
			<version>${jsonPath.version}</version>
		</dependency>
		<dependency>
			<groupId>org.apache.zookeeper</groupId>
			<artifactId>zookeeper</artifactId>
			<version>${zk.version}</version>
			<exclusions>
				<exclusion>
					<groupId>log4j</groupId>
					<artifactId>log4j</artifactId>
				</exclusion>
				<exclusion>
					<groupId>org.slf4j</groupId>
					<artifactId>slf4j-log4j12</artifactId>
				</exclusion>
			</exclusions>
		</dependency>
		<dependency>
			<groupId>org.apache.poi</groupId>
			<artifactId>poi</artifactId>
			<version>${apachePoi.version}</version>
		</dependency>
		<dependency>
			<groupId>org.apache.poi</groupId>
			<artifactId>poi-ooxml</artifactId>
			<version>${apachePoi.version}</version>
		</dependency>
		<dependency>
			<groupId>redis.clients</groupId>
			<artifactId>jedis</artifactId>
			<version>${jedis.version}</version>
		</dependency>
		<dependency>
			<groupId>javax.inject</groupId>
			<artifactId>javax.inject</artifactId>
			<version>${inject.version}</version>
		</dependency>

		<dependency>
			<groupId>com.navercorp.lucy</groupId>
			<artifactId>lucy-xss-servlet</artifactId>
			<version>${lucyXssServlet.version}</version>
			<exclusions>
				<exclusion>
					<groupId>commons-logging</groupId>
					<artifactId>commons-logging</artifactId>
				</exclusion>
			</exclusions>
		</dependency>
		<dependency>
			<groupId>com.navercorp.lucy</groupId>
			<artifactId>lucy-xss</artifactId>
			<version>${lucyXss.version}</version>
			<exclusions>
				<exclusion>
					<groupId>commons-logging</groupId>
					<artifactId>commons-logging</artifactId>
				</exclusion>
			</exclusions>
		</dependency>

		<dependency>
			<groupId>ch.qos.logback</groupId>
			<artifactId>logback-core</artifactId>
			<version>${logback.version}</version>
		</dependency>
		<dependency>
			<groupId>org.elasticsearch.client</groupId>
			<artifactId>elasticsearch-rest-high-level-client</artifactId>
			<version>${es.version}</version>
		</dependency>
		<dependency>
			<groupId>org.elasticsearch</groupId>
			<artifactId>elasticsearch</artifactId>
			<version>${es.version}</version>
		</dependency>

		<dependency>
			<groupId>org.springframework.boot</groupId>
			<artifactId>spring-boot-devtools</artifactId>
		</dependency>

		<dependency>
			<groupId>org.springframework.boot</groupId>
			<artifactId>spring-boot-starter-test</artifactId>
			<scope>test</scope>
			<exclusions>
				<exclusion>
					<groupId>org.junit.vintage</groupId>
					<artifactId>junit-vintage-engine</artifactId>
				</exclusion>
			</exclusions>
		</dependency>

		<dependency>
			<groupId>org.apache.httpcomponents</groupId>
			<artifactId>httpclient</artifactId>
			<version>4.5.13</version>
		</dependency>
		<dependency>
			<groupId>com.github.ulisesbocchio</groupId>
			<artifactId>jasypt-spring-boot</artifactId>
			<version>2.1.0</version>
		</dependency>
		<dependency>
			<groupId>org.jasypt</groupId>
			<artifactId>jasypt</artifactId>
			<version>1.9.2</version>
		</dependency>

		<dependency>
			<groupId>org.json</groupId>
			<artifactId>json</artifactId>
			<version>20220320</version>
		</dependency>

		<dependency>
			<groupId>org.mariadb.jdbc</groupId>
			<artifactId>mariadb-java-client</artifactId>
			<version>${mariadbVersion}</version>
		</dependency>
	</dependencies>
	<build>
		<plugins>
			<plugin>
				<groupId>org.springframework.boot</groupId>
				<artifactId>spring-boot-maven-plugin</artifactId>
			</plugin>
			<plugin>
				<groupId>org.apache.maven.plugins</groupId>
				<artifactId>maven-compiler-plugin</artifactId>
				<version>3.1</version>
				<configuration>
					<source>${java.version}</source>
					<target>${java.version}</target>
				</configuration>
			</plugin>
		</plugins>
	</build>
</project>
~~~

### `scheduler\pom.xml`

~~~text
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <parent>
        <groupId>com.kt.aicc</groupId>
        <version>0.0.1-SNAPSHOT</version>
        <artifactId>ktbot</artifactId>
    </parent>
    <modelVersion>4.0.0</modelVersion>

    <artifactId>scheduler</artifactId>
    <version>0.0.1-SNAPSHOT</version>
    <packaging>jar</packaging>

    <dependencies>
        <dependency>
            <groupId>com.kt.aicc</groupId>
            <artifactId>persistence</artifactId>
            <version>${project.version}</version>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-undertow</artifactId>
            <scope>provided</scope>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
            <exclusions>
                <exclusion>
                    <groupId>org.springframework.boot</groupId>
                    <artifactId>spring-boot-starter-tomcat</artifactId>
                </exclusion>
            </exclusions>
        </dependency>

        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-batch</artifactId>
        </dependency>

        <dependency>
            <groupId>org.quartz-scheduler</groupId>
            <artifactId>quartz</artifactId>
            <version>${quertz.version}</version>
            <exclusions>
                <exclusion>
                    <groupId>com.zaxxer</groupId>
                    <artifactId>HikariCP-java7</artifactId>
                </exclusion>
            </exclusions>
        </dependency>

        <dependency>
            <groupId>junit</groupId>
            <artifactId>junit</artifactId>
            <version>4.12</version>
            <scope>test</scope>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
            </plugin>
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-compiler-plugin</artifactId>
                <version>3.1</version>
                <configuration>
                    <source>${java.version}</source>
                    <target>${java.version}</target>
                </configuration>
            </plugin>
        </plugins>
    </build>
</project>
~~~

### `scheduler\src\main\resources\application-dev.yml`

~~~text
server:
  port: 8580
  servlet:
    context-path: /scheduler

logging:
  config: classpath:logging-dev-config.xml

spring:
  profiles:
    include: core-dev
  devtools:
    restart:
      enabled: false
    livereload:
      enabled: false
  main:
    allow-bean-definition-overriding: true
    lazy-initialization: false
  jpa:
    properties:
      hibernate:
        dialect: org.hibernate.dialect.MySQL5Dialect
    hibernate:
      ddl-auto: none
    open-in-view: true
    generate-ddl: true
    show-sql: false
  batch:
    initialize-schema: AlWAYS
    job:
      enabled: false
  quartz:
    scheduler-name: BotScheduler
  redis:
    cluster:
      nodes: redis1:7000,redis2:7001,redis3:7002

multitenancy:
  datasource-cache:
    maximumSize: 100
    expireAfterAccess: 10
  master:
    entityManager:
      packages: com.kt.aicc.ktbot.persistence.model.job,com.kt.aicc.ktbot.persistence.model.manage,com.kt.aicc.ktbot.persistence.model.common.generic,com.kt.aicc.ktbot.persistence.model.schema,com.kt.aicc.ktbot.persistence.model.tenant,com.kt.aicc.ktbot.persistence.model.nlu.category,com.kt.aicc.ktbot.persistence.model.bot,com.kt.aicc.ktbot.persistence.model.customer,com.kt.aicc.ktbot.persistence.model.nlu.intent,com.kt.aicc.ktbot.persistence.model.knowledge.chatflow,com.kt.aicc.ktbot.persistence.model.knowledge.parameter,com.kt.aicc.ktbot.persistence.model.knowledge.namedentity,com.kt.aicc.ktbot.persistence.model.knowledge.intentclassification,com.kt.aicc.ktbot.persistence.model.knowledge.api,com.kt.aicc.ktbot.persistence.model.knowledge.confirmentity,com.kt.aicc.ktbot.persistence.model.common.converter
    datasource:
      url: jdbc:mariadb://10.92.89.119:13306/meritz_db?characterEncoding=UTF-8&serverTimezone=UTC
      username: vbmardb
      password: <REDACTED>
      hikari:
        maximumPoolSize: 10
        minimumIdle: 5
        idleTimeout: 30000
    liquibase:
      enabled: false
  tenant:
    default-tenant: master
    entityManager:
      packages: com.kt.aicc.ktbot.persistence.model.batch,com.kt.aicc.ktbot.persistence.model.bot,com.kt.aicc.ktbot.persistence.model.nlu,com.kt.aicc.ktbot.persistence.model.customer,com.kt.aicc.ktbot.persistence.model.knowledge,com.kt.aicc.ktbot.persistence.model.user,com.kt.aicc.ktbot.persistence.model.dictionary,com.kt.aicc.ktbot.persistence.model.code,com.kt.aicc.ktbot.persistence.model.etc.product,com.kt.aicc.ktbot.persistence.model.logging,com.kt.aicc.ktbot.persistence.model.satisfaction,com.kt.aicc.ktbot.persistence.model.statistics.additionalServiceJoin,com.kt.aicc.ktbot.persistence.model.statistics.answerLink,com.kt.aicc.ktbot.persistence.model.statistics.answerLinkDetail,com.kt.aicc.ktbot.persistence.model.statistics.slot,com.kt.aicc.ktbot.persistence.model.statistics.dialog,com.kt.aicc.ktbot.persistence.model.statistics.knowledge,com.kt.aicc.ktbot.persistence.model.statistics.payment,com.kt.aicc.ktbot.persistence.model.statistics.satisfaction,com.kt.aicc.ktbot.persistence.model.statistics.simple,com.kt.aicc.ktbot.persistence.model.statistics.top10,com.kt.aicc.ktbot.persistence.model.statistics.api,com.kt.aicc.ktbot.persistence.model.statistics.scenario,com.kt.aicc.ktbot.persistence.model.statistics.user,com.kt.aicc.ktbot.persistence.model.statistics.situation,com.kt.aicc.ktbot.persistence.model.statistics.scenarioPattern,com.kt.aicc.ktbot.persistence.model.common,com.kt.aicc.ktbot.persistence.model.statistics.campaign
    datasource:
      hikari:
        maximumPoolSize: 10
        minimumIdle: 5
        idleTimeout: 30000
    liquibase:
      enabled: false

elasticsearch:
  clustername: meritz-es
  host1: localhost
  host2: localhost
  host3: localhost
  port: 9200
  scheme: http
  scrollTime: 10
  index: chatbot_b2b_log*
  server: dev

ibot:
  gateway:
    domain: http://localhost:8081/gateway
  cms:
    domain: http://localhost:8280

adapter:
  tb:
    url: http://10.217.69.132
  prod:
    url: http://10.217.69.132

job:
  cron:
    rcs: 0 0/5 * * * ?
    reservationDeploy: 0 * * * * ?
    learnRecommend: 0 30 * * * ?
    monitoring: 0 0/10 * * * ?
    esLogBackup: 0 24 15 * * ?
    statistics:
      user: 0 5 * * * ?
      ner: 0 10 * * * ?
      dialog: 0 15 * * * ?
      satisfaction: 0 15 0 * * ?
      answerLink: 0 20 0 * * ?
      addServiceJoin: 0 25 0 * * ?
      knowledge: 0 35 0 * * ?
      answerLinkDetail: 0 40 0 * * ?
      api: 0 45 * * * ?
      scenario: 0 50 * * * ?
      top10Dialog: 0 55 * * * ?
      dialogByCall: 0 1/3 * * * ?

jasypt:
  encryptor:
    bean: encryptorBean
    pkey: SYgwO1juM

master:
  api:
    url: http://localhost:8380

project:
  name: scheduler

header:
  x-auth-key: ZWFzeUNNU19JL0ZfQVBJ
  x-master-auth-key: GHFzeUBQU88JL0ZfLKOVV

meritz:
  storage-term: 150
  es-repository: backup
~~~

### `scheduler\src\main\resources\application-prod.yml`

~~~text
server:
  port: 8580
  servlet:
    context-path: /scheduler

logging:
  config: classpath:logging-prod-config.xml

spring:
  profiles:
    include: core-prod
  devtools:
    restart:
      enabled: false
    livereload:
      enabled: false
  main:
    allow-bean-definition-overriding: true
    lazy-initialization: true
  jpa:
    properties:
      hibernate:
        dialect: org.hibernate.dialect.MySQL5Dialect
    hibernate:
      ddl-auto: none
    open-in-view: true
    generate-ddl: true
    show-sql: false
  batch:
    initialize-schema: AlWAYS
    job:
      enabled: false
  quartz:
    scheduler-name: BotScheduler
  redis:
    cluster:
      nodes: redis1:7000,redis2:7000,redis3:7000

multitenancy:
  datasource-cache:
    maximumSize: 100
    expireAfterAccess: 10
  master:
    entityManager:
      packages: com.kt.aicc.ktbot.persistence.model.job,com.kt.aicc.ktbot.persistence.model.manage,com.kt.aicc.ktbot.persistence.model.common.generic,com.kt.aicc.ktbot.persistence.model.schema,com.kt.aicc.ktbot.persistence.model.tenant,com.kt.aicc.ktbot.persistence.model.nlu.category,com.kt.aicc.ktbot.persistence.model.bot,com.kt.aicc.ktbot.persistence.model.customer,com.kt.aicc.ktbot.persistence.model.nlu.intent,com.kt.aicc.ktbot.persistence.model.knowledge.chatflow,com.kt.aicc.ktbot.persistence.model.knowledge.parameter,com.kt.aicc.ktbot.persistence.model.knowledge.namedentity,com.kt.aicc.ktbot.persistence.model.knowledge.intentclassification,com.kt.aicc.ktbot.persistence.model.knowledge.api,com.kt.aicc.ktbot.persistence.model.knowledge.confirmentity,com.kt.aicc.ktbot.persistence.model.common.converter
    datasource:
      url: jdbc:mariadb://10.92.20.202:13306/meritz_db?characterEncoding=UTF-8&serverTimezone=UTC
      username: vbmardb
      password: <REDACTED>
      hikari:
        maximumPoolSize: 10
        minimumIdle: 5
        idleTimeout: 30000
    liquibase:
      enabled: false
  tenant:
    default-tenant: master
    entityManager:
      packages: com.kt.aicc.ktbot.persistence.model.batch,com.kt.aicc.ktbot.persistence.model.bot,com.kt.aicc.ktbot.persistence.model.nlu,com.kt.aicc.ktbot.persistence.model.customer,com.kt.aicc.ktbot.persistence.model.knowledge,com.kt.aicc.ktbot.persistence.model.user,com.kt.aicc.ktbot.persistence.model.dictionary,com.kt.aicc.ktbot.persistence.model.code,com.kt.aicc.ktbot.persistence.model.etc.product,com.kt.aicc.ktbot.persistence.model.logging,com.kt.aicc.ktbot.persistence.model.satisfaction,com.kt.aicc.ktbot.persistence.model.statistics.additionalServiceJoin,com.kt.aicc.ktbot.persistence.model.statistics.answerLink,com.kt.aicc.ktbot.persistence.model.statistics.answerLinkDetail,com.kt.aicc.ktbot.persistence.model.statistics.slot,com.kt.aicc.ktbot.persistence.model.statistics.dialog,com.kt.aicc.ktbot.persistence.model.statistics.knowledge,com.kt.aicc.ktbot.persistence.model.statistics.payment,com.kt.aicc.ktbot.persistence.model.statistics.satisfaction,com.kt.aicc.ktbot.persistence.model.statistics.simple,com.kt.aicc.ktbot.persistence.model.statistics.top10,com.kt.aicc.ktbot.persistence.model.statistics.api,com.kt.aicc.ktbot.persistence.model.statistics.scenario,com.kt.aicc.ktbot.persistence.model.statistics.user,com.kt.aicc.ktbot.persistence.model.common,com.kt.aicc.ktbot.persistence.model.statistics.campaign
    datasource:
      hikari:
        maximumPoolSize: 10
        minimumIdle: 5
        idleTimeout: 30000
    liquibase:
      enabled: false

elasticsearch:
  clustername: meritz-es
  host1: es1
  host2: es2
  host3: es3
  port: 9200
  scheme: http
  scrollTime: 10
  index: chatbot_b2b_log*
  server: prod

ibot:
  gateway:
    domain: http://10.20.30.243:8081/gateway
  cms:
    domain: http://vbcms.meritzfire.com

adapter:
  tb:
    url: http://10.217.69.132
  prod:
    url: http://10.217.69.132

job:
  cron:
    rcs: 0 0/5 * * * ?
    reservationDeploy: 0 * * * * ?
    learnRecommend: 0 30 * * * ?
    monitoring: 0 0/10 * * * ?
    esLogBackup: 0 24 15 * * ?
    statistics:
      user: 0 5 * * * ?
      ner: 0 10 * * * ?
      dialog: 0 15 * * * ?
      satisfaction: 0 15 0 * * ?
      answerLink: 0 20 0 * * ?
      addServiceJoin: 0 25 0 * * ?
      knowledge: 0 35 0 * * ?
      answerLinkDetail: 0 40 0 * * ?
      api: 0 45 * * * ?
      scenario: 0 50 * * * ?
      top10Dialog: 0 55 * * * ?
      dialogByCall: 0 1/3 * * * ?

jasypt:
  encryptor:
    bean: encryptorBean
    pkey: SYgwO1juM

master:
  api:
    url: http://10.20.30.243:8380

project:
  name: scheduler

header:
  x-auth-key: ZWFzeUNNU19JL0ZfQVBJ
  x-master-auth-key: GHFzeUBQU88JL0ZfLKOVV

meritz:
  storage-term: 365
  es-repository: backup
~~~

### `scheduler\src\main\resources\application-tc.yml`

~~~text
server:
  port: 8580
  servlet:
    context-path: /scheduler

logging:
  config: classpath:logging-tc-config.xml

spring:
  profiles:
    include: core-tc
  devtools:
    restart:
      enabled: false
    livereload:
      enabled: false
  main:
    allow-bean-definition-overriding: true
    lazy-initialization: true
  jpa:
    properties:
      hibernate:
        dialect: org.hibernate.dialect.MySQL5Dialect
    hibernate:
      ddl-auto: none
    open-in-view: true
    generate-ddl: true
    show-sql: false
  batch:
    initialize-schema: AlWAYS
    job:
      enabled: false
  quartz:
    scheduler-name: BotScheduler
  redis:
    cluster:
      nodes: localhost:6379

multitenancy:
  datasource-cache:
    maximumSize: 100
    expireAfterAccess: 10
  master:
    entityManager:
      packages: com.kt.aicc.ktbot.persistence.model.job,com.kt.aicc.ktbot.persistence.model.manage,com.kt.aicc.ktbot.persistence.model.common.generic,com.kt.aicc.ktbot.persistence.model.schema,com.kt.aicc.ktbot.persistence.model.tenant,com.kt.aicc.ktbot.persistence.model.nlu.category,com.kt.aicc.ktbot.persistence.model.bot,com.kt.aicc.ktbot.persistence.model.customer,com.kt.aicc.ktbot.persistence.model.nlu.intent,com.kt.aicc.ktbot.persistence.model.knowledge.chatflow,com.kt.aicc.ktbot.persistence.model.knowledge.parameter,com.kt.aicc.ktbot.persistence.model.knowledge.namedentity,com.kt.aicc.ktbot.persistence.model.knowledge.intentclassification,com.kt.aicc.ktbot.persistence.model.knowledge.api,com.kt.aicc.ktbot.persistence.model.knowledge.confirmentity,com.kt.aicc.ktbot.persistence.model.common.converter
    datasource:
      platform: mariadb
      url: jdbc:mariadb://mariadb1:13306/meritz_easycms?characterEncoding=UTF-8&serverTimezone=UTC
      username: vbmardb
      password: <REDACTED>
      driver-class-name: org.mariadb.jdbc.Driver
      type: com.zaxxer.hikari.HikariDataSource
      hikari:
        maximumPoolSize: 10
        minimumIdle: 5
        idleTimeout: 30000
    liquibase:
      enabled: false
  tenant:
    default-tenant: master
    entityManager:
      packages: com.kt.aicc.ktbot.persistence.model.batch,com.kt.aicc.ktbot.persistence.model.bot,com.kt.aicc.ktbot.persistence.model.nlu,com.kt.aicc.ktbot.persistence.model.customer,com.kt.aicc.ktbot.persistence.model.knowledge,com.kt.aicc.ktbot.persistence.model.user,com.kt.aicc.ktbot.persistence.model.dictionary,com.kt.aicc.ktbot.persistence.model.code,com.kt.aicc.ktbot.persistence.model.etc.product,com.kt.aicc.ktbot.persistence.model.logging,com.kt.aicc.ktbot.persistence.model.satisfaction,com.kt.aicc.ktbot.persistence.model.statistics.additionalServiceJoin,com.kt.aicc.ktbot.persistence.model.statistics.answerLink,com.kt.aicc.ktbot.persistence.model.statistics.answerLinkDetail,com.kt.aicc.ktbot.persistence.model.statistics.slot,com.kt.aicc.ktbot.persistence.model.statistics.dialog,com.kt.aicc.ktbot.persistence.model.statistics.knowledge,com.kt.aicc.ktbot.persistence.model.statistics.payment,com.kt.aicc.ktbot.persistence.model.statistics.satisfaction,com.kt.aicc.ktbot.persistence.model.statistics.simple,com.kt.aicc.ktbot.persistence.model.statistics.top10,com.kt.aicc.ktbot.persistence.model.statistics.api,com.kt.aicc.ktbot.persistence.model.statistics.scenario,com.kt.aicc.ktbot.persistence.model.statistics.user,com.kt.aicc.ktbot.persistence.model.common,com.kt.aicc.ktbot.persistence.model.statistics.campaign
    datasource:
      hikari:
        maximumPoolSize: 10
        minimumIdle: 5
        idleTimeout: 30000
    liquibase:
      enabled: false

elasticsearch:
  clustername: docker-cluster
  host1: localhost
  host2: localhost
  host3: localhost
  port: 9200
  scheme: http
  scrollTime: 10
  index: chatbot_b2b_log*
  server: local

ibot:
  gateway:
    domain: http://gateway:8081/gateway
  cms:
    domain: http://gateway:8280

adapter:
  tb:
    url: http://10.217.69.132
  prod:
    url: http://10.217.69.132

job:
  cron:
    rcs: 0 0/5 * * * ?
    reservationDeploy: 0 * * * * ?
    learnRecommend: 0 30 * * * ?
    monitoring: 0 0/10 * * * ?
    esLogBackup: 0 43 08 * * ?
    statistics:
      user: 0 5 * * * ?
      ner: 0 10 * * * ?
      dialog: 0 15 * * * ?
      satisfaction: 0 15 0 * * ?
      answerLink: 0 20 0 * * ?
      addServiceJoin: 0 25 0 * * ?
      knowledge: 0 35 0 * * ?
      answerLinkDetail: 0 40 0 * * ?
      api: 0 45 * * * ?
      scenario: 0 50 * * * ?
      top10Dialog: 0 55 * * * ?
      dialogByCall: 0 1/3 * * * ?

jasypt:
  encryptor:
    bean: encryptorBean
    pkey: SYgwO1juM

master:
  api:
    url: http://localhost:8380

project:
  name: scheduler

header:
  x-auth-key: ZWFzeUNNU19JL0ZfQVBJ
  x-master-auth-key: GHFzeUBQU88JL0ZfLKOVV

meritz:
  storage-term: 30
  es-repository: backup
~~~

### `scheduler\src\main\resources-dev\application.yml`

~~~text
server:
  port: 8580
  servlet:
    context-path: /scheduler

logging:
  config: classpath:logging-config.xml

spring:
  profiles:
    include: core
  devtools:
    restart:
      enabled: false
    livereload:
      enabled: false
  main:
    allow-bean-definition-overriding: true
    lazy-initialization: true
  jpa:
    properties:
      hibernate:
        dialect: org.hibernate.dialect.MariaDB103Dialect
    hibernate:
      ddl-auto: none
    open-in-view: true
    generate-ddl: true
    show-sql: false
  batch:
    initialize-schema: AlWAYS
    job:
      enabled: false
  quartz:
    scheduler-name: BotScheduler
  redis:
    cluster:
      nodes: redis1:7000,redis2:7001,redis3:7002

multitenancy:
  datasource-cache:
    maximumSize: 100
    expireAfterAccess: 10
  master:
    entityManager:
      packages: com.kt.aicc.ktbot.persistence.model.job,com.kt.aicc.ktbot.persistence.model.manage,com.kt.aicc.ktbot.persistence.model.common.generic,com.kt.aicc.ktbot.persistence.model.schema,com.kt.aicc.ktbot.persistence.model.tenant,com.kt.aicc.ktbot.persistence.model.nlu.category,com.kt.aicc.ktbot.persistence.model.bot,com.kt.aicc.ktbot.persistence.model.customer,com.kt.aicc.ktbot.persistence.model.nlu.intent,com.kt.aicc.ktbot.persistence.model.knowledge.chatflow,com.kt.aicc.ktbot.persistence.model.knowledge.parameter,com.kt.aicc.ktbot.persistence.model.knowledge.namedentity,com.kt.aicc.ktbot.persistence.model.knowledge.intentclassification,com.kt.aicc.ktbot.persistence.model.knowledge.api,com.kt.aicc.ktbot.persistence.model.knowledge.confirmentity,com.kt.aicc.ktbot.persistence.model.common.converter
    datasource:
      url: jdbc:mariadb://10.92.89.119:13306/meritz_db?characterEncoding=UTF-8&serverTimezone=UTC
      username: vbmardb
      password: <REDACTED>
      hikari:
        maximumPoolSize: 10
        minimumIdle: 5
        idleTimeout: 30000
    liquibase:
      enabled: false
  tenant:
    default-tenant: master
    entityManager:
      packages: com.kt.aicc.ktbot.persistence.model.batch,com.kt.aicc.ktbot.persistence.model.bot,com.kt.aicc.ktbot.persistence.model.nlu,com.kt.aicc.ktbot.persistence.model.customer,com.kt.aicc.ktbot.persistence.model.knowledge,com.kt.aicc.ktbot.persistence.model.user,com.kt.aicc.ktbot.persistence.model.dictionary,com.kt.aicc.ktbot.persistence.model.code,com.kt.aicc.ktbot.persistence.model.etc.product,com.kt.aicc.ktbot.persistence.model.logging,com.kt.aicc.ktbot.persistence.model.satisfaction,com.kt.aicc.ktbot.persistence.model.statistics.additionalServiceJoin,com.kt.aicc.ktbot.persistence.model.statistics.answerLink,com.kt.aicc.ktbot.persistence.model.statistics.answerLinkDetail,com.kt.aicc.ktbot.persistence.model.statistics.slot,com.kt.aicc.ktbot.persistence.model.statistics.dialog,com.kt.aicc.ktbot.persistence.model.statistics.knowledge,com.kt.aicc.ktbot.persistence.model.statistics.payment,com.kt.aicc.ktbot.persistence.model.statistics.satisfaction,com.kt.aicc.ktbot.persistence.model.statistics.simple,com.kt.aicc.ktbot.persistence.model.statistics.top10,com.kt.aicc.ktbot.persistence.model.statistics.api,com.kt.aicc.ktbot.persistence.model.statistics.scenario,com.kt.aicc.ktbot.persistence.model.statistics.user,com.kt.aicc.ktbot.persistence.model.common
    datasource:
      hikari:
        maximumPoolSize: 10
        minimumIdle: 5
        idleTimeout: 30000
    liquibase:
      enabled: false

elasticsearch:
  clustername: meritz-es
  host1: localhost
  host2: localhost
  host3: localhost
  port: 9200
  scheme: http
  scrollTime: 10
  index: chatbot_b2b_log*
  server: dev

ibot:
  gateway:
    domain: http://localhost:8080/gateway
  cms:
    domain: http://localhost:8280

adapter:
  tb:
    url: http://10.217.69.132
  prod:
    url: http://10.217.69.132

job:
  cron:
    rcs: 0 0/5 * * * ?
    reservationDeploy: 0 * * * * ?
    learnRecommend: 0 30 * * * ?
    monitoring: 0 0/10 * * * ?
    statistics:
      user: 0 5 * * * ?
      ner: 0 10 * * * ?
      dialog: 0 15 * * * ?
      satisfaction: 0 15 0 * * ?
      answerLink: 0 20 0 * * ?
      addServiceJoin: 0 25 0 * * ?
      knowledge: 0 35 0 * * ?
      answerLinkDetail: 0 40 0 * * ?
      api: 0 45 * * * ?
      scenario: 0 50 * * * ?
      top10Dialog: 0 20 * * * ?
      dialogByCall: 0 1/3 * * * ?

jasypt:
  encryptor:
    bean: encryptorBean
    pkey: SYgwO1juM

master:
  api:
    url: http://localhost:8380

project:
  name: scheduler

header:
  x-auth-key: ZWFzeUNNU19JL0ZfQVBJ
  x-master-auth-key: GHFzeUBQU88JL0ZfLKOVV
~~~

### `scheduler\src\main\resources-local\application.yml`

~~~text
server:
  port: 8580
  servlet:
    context-path: /scheduler

spring:
  profiles:
    include: core
  devtools:
    restart:
      enabled: false
    livereload:
      enabled: false
  main:
    allow-bean-definition-overriding: true
  jpa:
    properties:
      hibernate:
        dialect: org.hibernate.dialect.MySQL5Dialect
    hibernate:
      ddl-auto: none
    open-in-view: true
    generate-ddl: true
    show-sql: false
  batch:
    initialize-schema: AlWAYS
    job:
      enabled: false
  quartz:
    scheduler-name: BotScheduler
  redis:
    cluster:
      nodes: redis1:5000

multitenancy:
  datasource-cache:
    maximumSize: 100
    expireAfterAccess: 10
  master:
    entityManager:
      packages: com.kt.aicc.ktbot.persistence.model.job,com.kt.aicc.ktbot.persistence.model.manage,com.kt.aicc.ktbot.persistence.model.common.generic,com.kt.aicc.ktbot.persistence.model.schema,com.kt.aicc.ktbot.persistence.model.tenant,com.kt.aicc.ktbot.persistence.model.nlu.category,com.kt.aicc.ktbot.persistence.model.bot,com.kt.aicc.ktbot.persistence.model.customer,com.kt.aicc.ktbot.persistence.model.nlu.intent,com.kt.aicc.ktbot.persistence.model.knowledge.chatflow,com.kt.aicc.ktbot.persistence.model.knowledge.parameter,com.kt.aicc.ktbot.persistence.model.knowledge.namedentity,com.kt.aicc.ktbot.persistence.model.knowledge.intentclassification,com.kt.aicc.ktbot.persistence.model.knowledge.api,com.kt.aicc.ktbot.persistence.model.knowledge.confirmentity,com.kt.aicc.ktbot.persistence.model.common.converter
    datasource:
      url: jdbc:mariadb://localhost:13306/songsiwook
      username: songsiwook
      password: <REDACTED>
      hikari:
        maximumPoolSize: 5
        minimumIdle: 2
        idleTimeout: 30000
    liquibase:
      enabled: false
  tenant:
    default-tenant: MASTER
    entityManager:
      packages: com.kt.aicc.ktbot.persistence.model.batch,com.kt.aicc.ktbot.persistence.model.bot,com.kt.aicc.ktbot.persistence.model.nlu,com.kt.aicc.ktbot.persistence.model.customer,com.kt.aicc.ktbot.persistence.model.knowledge,com.kt.aicc.ktbot.persistence.model.user,com.kt.aicc.ktbot.persistence.model.dictionary,com.kt.aicc.ktbot.persistence.model.code,com.kt.aicc.ktbot.persistence.model.etc.product,com.kt.aicc.ktbot.persistence.model.logging,com.kt.aicc.ktbot.persistence.model.satisfaction,com.kt.aicc.ktbot.persistence.model.statistics.additionalServiceJoin,com.kt.aicc.ktbot.persistence.model.statistics.answerLink,com.kt.aicc.ktbot.persistence.model.statistics.answerLinkDetail,com.kt.aicc.ktbot.persistence.model.statistics.slot,com.kt.aicc.ktbot.persistence.model.statistics.dialog,com.kt.aicc.ktbot.persistence.model.statistics.knowledge,com.kt.aicc.ktbot.persistence.model.statistics.payment,com.kt.aicc.ktbot.persistence.model.statistics.satisfaction,com.kt.aicc.ktbot.persistence.model.statistics.simple,com.kt.aicc.ktbot.persistence.model.statistics.top10,com.kt.aicc.ktbot.persistence.model.statistics.api,com.kt.aicc.ktbot.persistence.model.statistics.scenario,com.kt.aicc.ktbot.persistence.model.statistics.user,com.kt.aicc.ktbot.persistence.model.common
    datasource:
      hikari:
        maximumPoolSize: 10
        minimumIdle: 5
        idleTimeout: 30000
    liquibase:
      enabled: false

elasticsearch:
  clustername: aicc-es
  host1: 10.213.176.197
  host2: 10.213.176.242
  host3: 10.213.176.195
  port: 9200
  scheme: http
  scrollTime: 10
  index: chatbot_b2b_log*
  server: local

ibot:
  gateway:
    domain: http://localhost:8080/gateway
  cms:
    domain: http://localhost:8280

adapter:
  tb:
    url: http://10.217.69.132
  prod:
    url: http://10.217.69.132

job:
  cron:
    rcs: 0 50 * * * ?
    reservationDeploy: 0 * * * * ?
    learnRecommend: 0 30 * * * ?
    monitoring: 0 0/10 * * * ?
    statistics:
      user: 0 5 12 * * ?
      ner: 0 15 12 * * ?
      dialog: 0 10 12 * * ?
      satisfaction: 0 15 12 * * ?
      answerLink: 0 20 12 * * ?
      answerLinkDetail: 0 42 15 * * ?
      addServiceJoin: 0 25 12 * * ?
      top10Dialog: 0 30 12 * * ?
      knowledge: 0 35 12 * * ?
      api: 0 47 12 * * ?
      scenario: 0 15 3 * * ?
      dialogByCall: 0 1/3 * * * ?

jasypt:
  encryptor:
    bean: encryptorBean
    pkey: SYgwO1juM

master:
  api:
    url: http://localhost:8380

project:
  name: scheduler

header:
  x-auth-key: ZWFzeUNNU19JL0ZfQVBJ
  x-master-auth-key: GHFzeUBQU88JL0ZfLKOVV
~~~

### `scheduler\src\main\resources-prod\application.yml`

~~~text
server:
  port: 8580
  servlet:
    context-path: /scheduler

spring:
  profiles:
    include: core
  devtools:
    restart:
      enabled: false
    livereload:
      enabled: false
  main:
    allow-bean-definition-overriding: true
  jpa:
    properties:
      hibernate:
        dialect: org.hibernate.dialect.MariaDB103Dialect
    hibernate:
      ddl-auto: none
    open-in-view: true
    generate-ddl: true
    show-sql: false
  batch:
    initialize-schema: AlWAYS
    job:
      enabled: false
  quartz:
    scheduler-name: BotScheduler
  redis:
    cluster:
      nodes: redis1:7000,redis2:7001,redis3:7002

multitenancy:
  datasource-cache:
    maximumSize: 100
    expireAfterAccess: 10
  master:
    entityManager:
      packages: com.kt.aicc.ktbot.persistence.model.job,com.kt.aicc.ktbot.persistence.model.manage,com.kt.aicc.ktbot.persistence.model.common.generic,com.kt.aicc.ktbot.persistence.model.schema,com.kt.aicc.ktbot.persistence.model.tenant,com.kt.aicc.ktbot.persistence.model.nlu.category,com.kt.aicc.ktbot.persistence.model.bot,com.kt.aicc.ktbot.persistence.model.customer,com.kt.aicc.ktbot.persistence.model.nlu.intent,com.kt.aicc.ktbot.persistence.model.knowledge.chatflow,com.kt.aicc.ktbot.persistence.model.knowledge.parameter,com.kt.aicc.ktbot.persistence.model.knowledge.namedentity,com.kt.aicc.ktbot.persistence.model.knowledge.intentclassification,com.kt.aicc.ktbot.persistence.model.knowledge.api,com.kt.aicc.ktbot.persistence.model.knowledge.confirmentity,com.kt.aicc.ktbot.persistence.model.common.converter
    datasource:
      url: jdbc:mariadb://localhost:13306/meritz_db
      username: vbmardb
      password: <REDACTED>
      hikari:
        maximumPoolSize: 10
        minimumIdle: 5
        idleTimeout: 30000
    liquibase:
      enabled: false
  tenant:
    default-tenant: master
    entityManager:
      packages: com.kt.aicc.ktbot.persistence.model.batch,com.kt.aicc.ktbot.persistence.model.bot,com.kt.aicc.ktbot.persistence.model.nlu,com.kt.aicc.ktbot.persistence.model.customer,com.kt.aicc.ktbot.persistence.model.knowledge,com.kt.aicc.ktbot.persistence.model.user,com.kt.aicc.ktbot.persistence.model.dictionary,com.kt.aicc.ktbot.persistence.model.code,com.kt.aicc.ktbot.persistence.model.etc.product,com.kt.aicc.ktbot.persistence.model.logging,com.kt.aicc.ktbot.persistence.model.satisfaction,com.kt.aicc.ktbot.persistence.model.statistics.additionalServiceJoin,com.kt.aicc.ktbot.persistence.model.statistics.answerLink,com.kt.aicc.ktbot.persistence.model.statistics.answerLinkDetail,com.kt.aicc.ktbot.persistence.model.statistics.slot,com.kt.aicc.ktbot.persistence.model.statistics.dialog,com.kt.aicc.ktbot.persistence.model.statistics.knowledge,com.kt.aicc.ktbot.persistence.model.statistics.payment,com.kt.aicc.ktbot.persistence.model.statistics.satisfaction,com.kt.aicc.ktbot.persistence.model.statistics.simple,com.kt.aicc.ktbot.persistence.model.statistics.top10,com.kt.aicc.ktbot.persistence.model.statistics.api,com.kt.aicc.ktbot.persistence.model.statistics.scenario,com.kt.aicc.ktbot.persistence.model.statistics.user,com.kt.aicc.ktbot.persistence.model.common
    datasource:
      hikari:
        maximumPoolSize: 10
        minimumIdle: 5
        idleTimeout: 30000
    liquibase:
      enabled: false

elasticsearch:
  clustername: meritz-es
  host1: localhost
  host2: localhost
  host3: localhost
  port: 9200
  scheme: http
  scrollTime: 10
  index: chatbot_b2b_log*
  server: prod

ibot:
  gateway:
    domain: http://localhost:8180/gateway
  cms:
    domain: http://localhost:8480

adapter:
  tb:
    url: http://10.217.69.132
  prod:
    url: http://10.217.69.132

job:
  cron:
    rcs: 0 0/5 * * * ?
    reservationDeploy: 0 * * * * ?
    learnRecommend: 0 30 * * * ?
    monitoring: 0 0/10 * * * ?
    statistics:
      user: 0 5 * * * ?
      ner: 0 10 * * * ?
      dialog: 0 15 * * * ?
      satisfaction: 0 15 0 * * ?
      answerLink: 0 20 0 * * ?
      addServiceJoin: 0 25 0 * * ?
      knowledge: 0 35 0 * * ?
      answerLinkDetail: 0 40 0 * * ?
      api: 0 45 * * * ?
      scenario: 0 50 * * * ?
      top10Dialog: 0 55 * * * ?
      dialogByCall: 0 1/3 * * * ?

jasypt:
  encryptor:
    bean: encryptorBean
    pkey: SYgwO1juM

master:
  api:
    url: http://localhost:8380

project:
  name: scheduler

header:
  x-auth-key: ZWFzeUNNU19JL0ZfQVBJ
  x-master-auth-key: GHFzeUBQU88JL0ZfLKOVV
~~~
