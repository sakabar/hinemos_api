const badRequestError = {
    error: {
        message: 'Bad Request',
        code: 400,
    },
};

const getProcess = (req, res, next, db, logger) => {
    const userName = req.decoded.userName;
    const part = req.params.part;

    let model;
    if (part === 'corner') {
        model = db.ThreeStyleQuizListNameCorner;
    } else if (part === 'edgeMiddle') {
        model = db.ThreeStyleQuizListNameEdgeMiddle;
    }

    const query = {
        where: {
            userName,
        },
    };

    return model
        .findAll(query)
        .then((result) => {
            logger.emit('api.request', {
                requestType: 'GET',
                endpoint: '/hinemos/threeStyleQuizListName',
                params: {
                    userName,
                },
                status: 'success',
                code: 200,
                msg: '',
            });

            const ans = {
                success: {
                    code: 200,
                    result,
                },
            };

            res.json(ans);
            res.status(200);
        }, () => {
            logger.emit('api.request', {
                requestType: 'GET',
                endpoint: '/hinemos/threeStyleQuizListName',
                params: {
                    userName,
                },
                status: 'error',
                code: 400,
                msg: '',
            });
            res.status(400).send(badRequestError);
        });
};

const postProcess = (req, res, next, db, logger) => {
    const userName = req.decoded.userName;
    const part = req.params.part;
    const title = req.body.title;

    if (!userName || !title || !(part === 'corner' || part === 'edgeMiddle')) {
        logger.emit('api.request', {
            requestType: 'POST',
            endpoint: '/hinemos/threeStyleQuizListName/',
            params: {
                userName,
                part,
                title,
                decoded: req.decoded,
            },
            status: 'error',
            code: 400,
            msg: '',
        });
        res.status(400).send(badRequestError);
        return;
    }

    let model;
    if (part === 'corner') {
        model = db.ThreeStyleQuizListNameCorner;
    } else if (part === 'edgeMiddle') {
        model = db.ThreeStyleQuizListNameEdgeMiddle;
    }

    const instance = {
        userName,
        title,
    };

    return model
        .create(instance)
        .then((result) => {
            logger.emit('api.request', {
                requestType: 'POST',
                endpoint: '/hinemos/threeStyleQuizListName',
                params: {
                    userName,
                    title,
                },
                status: 'success',
                code: 200,
                msg: '',
            });

            const ans = {
                success: {
                    code: 200,
                    result,
                },
            };

            res.json(ans);
            res.status(200);
        })
        .catch(() => {
            logger.emit('api.request', {
                requestType: 'POST',
                endpoint: '/hinemos/threeStyleQuizListName',
                params: {
                    userName,
                    title,
                },
                status: 'error',
                code: 400,
                msg: '',
            });
            res.status(400).send(badRequestError);
        });
};

exports.getProcess = getProcess;
exports.postProcess = postProcess;
