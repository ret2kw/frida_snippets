


var handles = {};
var ptrsz = Process.pointerSize


/* constructor to wrap POBJECT_ATTRIBUTES struct */
function POBJECT_ATTRIBUTES(pointer, handles) {

    /* 40 bytes
    typedef struct _OBJECT_ATTRIBUTES
    {
        ULONG Length;   // 4 bytes
        PVOID RootDirectory; // 8 bytes (on x64)
        PUNICODE_STRING ObjectName; // 8 bytes (on x64)
        ULONG Attributes; // 4 bytes
        PVOID SecurityDescriptor; // 8 bytes (on x64)
        PVOID SecurityQualityOfService; // 8 bytes (on x64)
    } OBJECT_ATTRIBUTES, *POBJECT_ATTRIBUTES;
    */
  
    this.pointer = pointer;
    //var sz = 4 + (2 * ptrsz) + 4 + (2 * ptrsz)
    //console.log ("objectattribute struct size is " + sz + " on this arch");

    this.RootDirectory = pointer.add(4).readPointer();
    //console.log("RootDirectory Handle "  + this.RootDirectory);

    // if NULL then the path is fully qualified, otherwise it is relative to the handle found here
    if (this.RootDirectory != 0x0) {
        console.log("non null rootdir " + this.RootDirectory);
        //get the directory name tied to this particular handle
        this.RootDirectoryName = handles[this.RootDirectory];
    } else {
        this.RootDirectoryName = false;
    }

    var pObjectName = pointer.add( 4 + ptrsz ).readPointer();
    //console.log('pointer to object name ' + pObjectName)

    /*
    typedef struct _UNICODE_STRING {
        USHORT Length;  // 2 bytes
        USHORT MaximumLength; // 2 bytes
        PWSTR  Buffer;
    } UNICODE_STRING, *PUNICODE_STRING;
    */

    var str_length = Memory.readUShort(pObjectName)
    this.ObjectName = pObjectName.add(4).readPointer().readUtf16String();

  }




/* 
__kernel_entry NTSTATUS NtCreateFile(
    PHANDLE            FileHandle,
    ACCESS_MASK        DesiredAccess,
    POBJECT_ATTRIBUTES ObjectAttributes,
    PIO_STATUS_BLOCK   IoStatusBlock,
    PLARGE_INTEGER     AllocationSize,
    ULONG              FileAttributes,
    ULONG              ShareAccess,
    ULONG              CreateDisposition,
    ULONG              CreateOptions,
    PVOID              EaBuffer,
    ULONG              EaLength
  );
  */

Interceptor.attach(Module.getExportByName(null, 'NtCreateFile'), {

    onEnter: function (args) {

        this.dbg = DebugSymbol.fromAddress(this.context.pc).name;
        console.log ("entering " + this.dbg );
        //console.log('Context  : ' + JSON.stringify(this.context));

        this.PHANDLE = args[0];

        this.ObjectAttributes = new POBJECT_ATTRIBUTES(ptr(args[2]), handles);
        this.ObjectName = this.ObjectAttributes.ObjectName
        console.log("ObjectName " + this.ObjectName );

    },

    onLeave: function (retval) {
        //if retval is STATUS_SUCCESS (0x00000000) lets log the handle
        if (retval == 0x0) {
            var handle = Memory.readPointer(this.PHANDLE);
            handles[handle] = this.ObjectName;

        }
        console.log("leaving " + this.dbg);
    }
  
});

/*
__kernel_entry NTSTATUS NtOpenFile(
    PHANDLE            FileHandle,
    ACCESS_MASK        DesiredAccess,
    POBJECT_ATTRIBUTES ObjectAttributes,
    PIO_STATUS_BLOCK   IoStatusBlock,
    ULONG              ShareAccess,
    ULONG              OpenOptions
  );
*/

Interceptor.attach(Module.getExportByName(null, 'NtOpenFile'), {

    onEnter: function (args) {

        this.dbg = DebugSymbol.fromAddress(this.context.pc).name;
        console.log ("entering " + this.dbg );

        this.PHANDLE = args[0];

        this.ObjectAttributes = new POBJECT_ATTRIBUTES(ptr(args[2]), handles);
        this.ObjectName = this.ObjectAttributes.ObjectName
        console.log("ObjectName " + this.ObjectName);

    },

    onLeave: function (retval) {
        //if retval is STATUS_SUCCESS (0x00000000) lets log the handle
        if (retval == 0x0) {
            var handle = Memory.readPointer(this.PHANDLE);
            handles[handle] = this.ObjectName;

        }
        console.log("leaving " + this.dbg);
    }

});