class ApiError extends Error{
    constructor(
        statusCode,
        message= "something went wrong",
        error = [],
        statck = ""
    ){
        super(message)
        this.statusCode = statusCode,
        this.error = error,
        this.message = message,
        this.success = false,
        this.data = null

        if(statck){
                this.stack = stack
        }else{
            Error.captureStackTrace(this, this.constructor)
        }
    }
}

export {ApiError}